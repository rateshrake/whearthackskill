/**
 * VayuShield Backend Services
 * Module: resilientHttp.ts
 *
 * Deep module encapsulating outbound HTTP reliability & security controls:
 * - Explicit AbortSignal timeouts on every upstream call
 * - Response body size caps (prevents memory exhaustion from large upstream payloads)
 * - Per-provider Circuit Breakers (fail fast during outages, half-open recovery)
 * - Bounded jittered retries on idempotent GET requests
 * - Credential/token URL redaction in all logs and thrown errors
 */

import { recordUpstreamMetric, type UpstreamProviderName } from "./observability";

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerStatus {
  provider: UpstreamProviderName;
  state: CircuitState;
  consecutiveFailures: number;
  openedAtIso: string | null;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  openDurationMs?: number;
}

export class CircuitBreaker {
  private readonly provider: UpstreamProviderName;
  private readonly failureThreshold: number;
  private readonly openDurationMs: number;
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAtMs: number | null = null;

  constructor(provider: UpstreamProviderName, options: CircuitBreakerOptions = {}) {
    this.provider = provider;
    this.failureThreshold = Math.max(1, options.failureThreshold ?? 5);
    this.openDurationMs = Math.max(1000, options.openDurationMs ?? 30_000);
  }

  canAttempt(now = Date.now()): boolean {
    if (this.state === "closed") return true;
    if (this.state === "open") {
      if (this.openedAtMs !== null && now - this.openedAtMs >= this.openDurationMs) {
        this.state = "half_open";
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "closed";
    this.openedAtMs = null;
  }

  recordFailure(now = Date.now()): void {
    this.consecutiveFailures++;
    if (this.state === "half_open" || this.consecutiveFailures >= this.failureThreshold) {
      this.state = "open";
      this.openedAtMs = now;
    }
  }

  reset(): void {
    this.state = "closed";
    this.consecutiveFailures = 0;
    this.openedAtMs = null;
  }

  getStatus(): CircuitBreakerStatus {
    return {
      provider: this.provider,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      openedAtIso:
        this.openedAtMs !== null ? new Date(this.openedAtMs).toISOString() : null,
    };
  }
}

const breakers: Record<UpstreamProviderName, CircuitBreaker> = {
  google_maps: new CircuitBreaker("google_maps"),
  open_meteo_aq: new CircuitBreaker("open_meteo_aq"),
  open_meteo_weather: new CircuitBreaker("open_meteo_weather"),
  waqi: new CircuitBreaker("waqi"),
  openaq: new CircuitBreaker("openaq"),
  nasa_firms: new CircuitBreaker("nasa_firms"),
  gemini: new CircuitBreaker("gemini"),
};

export function getCircuitBreaker(provider: UpstreamProviderName): CircuitBreaker {
  return breakers[provider];
}

export function getAllCircuitStatuses(): CircuitBreakerStatus[] {
  return Object.values(breakers).map((b) => b.getStatus());
}

export function resetAllCircuitBreakers(): void {
  for (const breaker of Object.values(breakers)) {
    breaker.reset();
  }
}

/**
 * Scrubs sensitive URL credentials, tokens, and Google API keys from strings before logging or throwing.
 */
export function redactSecrets(input: string): string {
  return input
    .replace(/([?&](?:key|token|apiKey|api_key)=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/(\/api\/area\/csv\/)[^/\s"']+\//gi, "$1[REDACTED]/")
    .replace(/AIza[0-9A-Za-z\-_]{15,}/g, "[REDACTED_KEY]");
}

export class UpstreamCircuitOpenError extends Error {
  constructor(provider: UpstreamProviderName) {
    super(`Circuit breaker open for upstream provider: ${provider}`);
    this.name = "UpstreamCircuitOpenError";
  }
}

export class ResponseSizeLimitError extends Error {
  constructor(provider: UpstreamProviderName, maxBytes: number) {
    super(`Upstream response from ${provider} exceeded ${maxBytes} byte limit`);
    this.name = "ResponseSizeLimitError";
  }
}

async function readResponseTextBounded(
  response: Response,
  provider: UpstreamProviderName,
  maxBytes: number,
): Promise<string> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const declaredLength = Number(contentLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new ResponseSizeLimitError(provider, maxBytes);
    }
  }

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new ResponseSizeLimitError(provider, maxBytes);
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let result = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => {});
          throw new ResponseSizeLimitError(provider, maxBytes);
        }
        result += decoder.decode(value, { stream: true });
      }
    }
    result += decoder.decode();
    return result;
  } catch (err: unknown) {
    await reader.cancel().catch(() => {});
    throw err;
  }
}

export interface ResilientFetchOptions {
  provider: UpstreamProviderName;
  timeoutMs?: number;
  maxBytes?: number;
  maxRetries?: number;
  requestInit?: RequestInit;
}

export interface ResilientFetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  bodyText: string;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Executes an outbound HTTP request guarded by circuit breaker, timeout,
 * bounded body read, and optional jittered retry for idempotent requests.
 */
export async function fetchWithResilience(
  url: string,
  options: ResilientFetchOptions,
): Promise<ResilientFetchResult> {
  const {
    provider,
    timeoutMs = 4000,
    maxBytes = 512 * 1024,
    maxRetries = 0,
    requestInit = {},
  } = options;

  const breaker = getCircuitBreaker(provider);
  if (!breaker.canAttempt()) {
    recordUpstreamMetric(provider, false, 0);
    throw new UpstreamCircuitOpenError(provider);
  }

  const method = (requestInit.method ?? "GET").toUpperCase();
  const allowedRetries = method === "GET" || method === "HEAD" ? maxRetries : 0;
  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= allowedRetries; attempt++) {
    if (attempt > 0) {
      const jitterMs = 75 + Math.floor(Math.random() * 125);
      await new Promise((resolve) => setTimeout(resolve, jitterMs));
    }

    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = requestInit.signal
      ? AbortSignal.any([requestInit.signal, timeoutSignal])
      : timeoutSignal;

    try {
      const response = await fetch(url, {
        ...requestInit,
        redirect: "error",
        signal,
      });

      const bodyText = await readResponseTextBounded(response, provider, maxBytes);

      if (response.ok) {
        breaker.recordSuccess();
        recordUpstreamMetric(provider, true, Date.now() - startedAt);
        return {
          ok: true,
          status: response.status,
          statusText: response.statusText,
          bodyText,
        };
      }

      if (isRetryableStatus(response.status)) {
        if (attempt < allowedRetries) {
          continue;
        }
        breaker.recordFailure();
      }

      recordUpstreamMetric(provider, false, Date.now() - startedAt);
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        bodyText,
      };
    } catch (error: unknown) {
      lastError = error;
      if (error instanceof ResponseSizeLimitError) {
        breaker.recordFailure();
        recordUpstreamMetric(provider, false, Date.now() - startedAt);
        throw error;
      }
      if (attempt < allowedRetries) {
        continue;
      }
      breaker.recordFailure();
      recordUpstreamMetric(provider, false, Date.now() - startedAt);
      const rawMessage = error instanceof Error ? error.message : "Upstream fetch failed";
      throw new Error(redactSecrets(rawMessage));
    }
  }

  const rawMessage =
    lastError instanceof Error ? lastError.message : "Upstream fetch exhausted";
  throw new Error(redactSecrets(rawMessage));
}
