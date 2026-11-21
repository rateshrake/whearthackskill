/**
 * VayuShield Backend Services
 * Module: rateLimiter.ts
 *
 * Sliding-window in-memory per-IP rate limiter for serverless & Cloud Run containers.
 * Enforces e.g. 30 requests / minute / IP and returns structured HTTP 429 payload.
 */

export interface RateLimitConfig {
  maxRequests: number; // default: 30 requests
  windowMs: number; // default: 60,000 ms (1 minute)
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits: Map<string, number[]>;
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.hits = new Map();
    this.maxRequests = config.maxRequests ?? 30;
    this.windowMs = config.windowMs ?? 60 * 1000;
  }

  /**
   * Evaluates if the IP is allowed to proceed under the current sliding window.
   */
  check(ip: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Retrieve existing timestamps and filter out those outside current sliding window
    const timestamps = (this.hits.get(ip) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldestInWindow = timestamps[0] ?? now;
      const resetSeconds = Math.max(
        1,
        Math.ceil((oldestInWindow + this.windowMs - now) / 1000),
      );

      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetSeconds,
      };
    }

    // Record this hit
    timestamps.push(now);
    this.hits.set(ip, timestamps);

    const remaining = this.maxRequests - timestamps.length;
    const oldestInWindow = timestamps[0] ?? now;
    const resetSeconds = Math.max(
      1,
      Math.ceil((oldestInWindow + this.windowMs - now) / 1000),
    );

    return {
      allowed: true,
      limit: this.maxRequests,
      remaining,
      resetSeconds,
    };
  }

  /**
   * Resets rate limiter memory.
   */
  reset(): void {
    this.hits.clear();
  }

  /**
   * Periodic garbage collector to prune stale IPs.
   */
  purgeStale(): void {
    const windowStart = Date.now() - this.windowMs;
    for (const [ip, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        this.hits.delete(ip);
      } else {
        this.hits.set(ip, valid);
      }
    }
  }
}

export const globalRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
});
