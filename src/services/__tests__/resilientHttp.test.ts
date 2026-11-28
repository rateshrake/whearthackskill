import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CircuitBreaker,
  ResponseSizeLimitError,
  UpstreamCircuitOpenError,
  fetchWithResilience,
  getCircuitBreaker,
  redactSecrets,
  resetAllCircuitBreakers,
} from "../resilientHttp";

describe("Service 6: resilientHttp & Circuit Breakers", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetAllCircuitBreakers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejects responses whose declared Content-Length exceeds maxBytes", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("tiny", {
        status: 200,
        headers: { "content-length": "2048" },
      }),
    );

    await expect(
      fetchWithResilience("https://example.com/data", {
        provider: "open_meteo_aq",
        maxBytes: 1024,
      }),
    ).rejects.toThrow(ResponseSizeLimitError);
  });

  it("aborts streaming responses that exceed maxBytes without Content-Length", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("a".repeat(600)));
        controller.enqueue(encoder.encode("b".repeat(600)));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));

    await expect(
      fetchWithResilience("https://example.com/stream", {
        provider: "nasa_firms",
        maxBytes: 1000,
      }),
    ).rejects.toThrow(ResponseSizeLimitError);
  });

  it("opens circuit breaker after threshold failures and transitions half-open after cooldown", async () => {
    const breaker = new CircuitBreaker("waqi", {
      failureThreshold: 2,
      openDurationMs: 2000,
    });
    expect(breaker.canAttempt(1000)).toBe(true);
    breaker.recordFailure(1000);
    expect(breaker.getStatus().state).toBe("closed");
    breaker.recordFailure(1100);
    expect(breaker.getStatus().state).toBe("open");
    expect(breaker.canAttempt(2000)).toBe(false);
    expect(breaker.canAttempt(3200)).toBe(true);
    expect(breaker.getStatus().state).toBe("half_open");
    breaker.recordSuccess();
    expect(breaker.getStatus().state).toBe("closed");
  });

  it("throws UpstreamCircuitOpenError when provider breaker is open", async () => {
    const breaker = getCircuitBreaker("openaq");
    for (let i = 0; i < 5; i++) {
      breaker.recordFailure();
    }
    await expect(
      fetchWithResilience("https://api.openaq.org/v3/locations", {
        provider: "openaq",
      }),
    ).rejects.toThrow(UpstreamCircuitOpenError);
  });

  it("retries GET requests on 503 and returns ok on retry success", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      calls++;
      if (calls === 1) {
        return Promise.resolve(new Response("Service Unavailable", { status: 503 }));
      }
      return Promise.resolve(new Response('{"ok":true}', { status: 200 }));
    });

    const res = await fetchWithResilience("https://example.com/retry", {
      provider: "open_meteo_weather",
      maxRetries: 1,
    });
    expect(res.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it("redacts Bearer tokens containing special characters such as $ and !", () => {
    expect(redactSecrets("Bearer tok$123!abc")).toBe("Bearer [REDACTED]");
    expect(redactSecrets("Bearer my.jwt+token$with!symbols==")).toBe("Bearer [REDACTED]");

    const headerRedacted = redactSecrets("Authorization: Bearer tok$123!abc");
    expect(headerRedacted).not.toContain("tok");
    expect(headerRedacted).not.toContain("$123");
    expect(headerRedacted).not.toContain("!abc");
    expect(headerRedacted).toContain("[REDACTED]");
  });

  it("SEC-8: redacts JSON-quoted API-key and Authorization headers without false positives", () => {
    const compactJson = JSON.stringify({
      "x-goog-api-key": "json_secret_123",
      "x-api-key": "json_api_456",
      authorization: "Basic dXNlcjpwYXNz",
    });
    const redactedCompact = redactSecrets(compactJson);
    expect(redactedCompact).not.toContain("json_secret_123");
    expect(redactedCompact).not.toContain("json_api_456");
    expect(redactedCompact).not.toContain("dXNlcjpwYXNz");
    expect(redactedCompact).toContain("[REDACTED]");

    const prettyJson = JSON.stringify(
      {
        "x-goog-api-key": "pretty_secret_789",
        "x-api-key": "pretty_api_012",
        authorization: "Basic c2VjcmV0OnBhc3M=",
      },
      null,
      2,
    );
    const redactedPretty = redactSecrets(prettyJson);
    expect(redactedPretty).not.toContain("pretty_secret_789");
    expect(redactedPretty).not.toContain("pretty_api_012");
    expect(redactedPretty).not.toContain("c2VjcmV0OnBhc3M=");

    expect(redactSecrets("Basic validation failed")).toBe("Basic validation failed");
  });

  it("SEC-8: scrubs non-Bearer/Basic authorization schemes in JSON and raw headers", () => {
    const tokenJson = redactSecrets(
      JSON.stringify({ authorization: "Token secret_token_xyz" }),
    );
    expect(tokenJson).not.toContain("secret_token_xyz");
    expect(tokenJson).toContain("[REDACTED]");

    const digestJson = redactSecrets(
      JSON.stringify({
        authorization: 'Digest username="alice", response="deadbeef1234"',
      }),
    );
    expect(digestJson).not.toContain("alice");
    expect(digestJson).not.toContain("deadbeef1234");
    expect(digestJson).toContain("[REDACTED]");

    const rawTokenHeader = redactSecrets("Authorization: Token secret_token_xyz");
    expect(rawTokenHeader).not.toContain("secret_token_xyz");
    expect(rawTokenHeader).toContain("Token [REDACTED]");

    const rawApiKeyHeader = redactSecrets("Authorization: ApiKey ak_live_987654");
    expect(rawApiKeyHeader).not.toContain("ak_live_987654");
    expect(rawApiKeyHeader).toContain("ApiKey [REDACTED]");

    const rawDigestHeader = redactSecrets(
      'Authorization: Digest username="alice", response="deadbeef1234"',
    );
    expect(rawDigestHeader).not.toContain("alice");
    expect(rawDigestHeader).not.toContain("deadbeef1234");
    expect(rawDigestHeader).toContain("Digest [REDACTED]");

    const unquotedObj = redactSecrets(
      "{authorization: Token secret_token_xyz, status: 401}",
    );
    expect(unquotedObj).not.toContain("secret_token_xyz");
    expect(unquotedObj).toContain("status: 401");

    expect(redactSecrets("Basic validation failed")).toBe("Basic validation failed");
    expect(redactSecrets("Bearer tok$123!abc")).toBe("Bearer [REDACTED]");
  });
});
