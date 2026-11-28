/**
 * VayuShield Backend Services
 * Module: rateLimiter.ts
 *
 * Bounded sliding-window in-memory per-IP rate limiter for serverless & Cloud Run containers.
 * Enforces maxRequests / windowMs per client IP with automatic stale purging and
 * bounded Map capacity to prevent memory exhaustion under spoofed IP floods.
 */

export interface RateLimitConfig {
  maxRequests: number; // default: 30 requests
  windowMs: number; // default: 60,000 ms (1 minute)
  maxEntries: number; // default: 10,000 tracked IPs
  purgeEveryChecks: number; // default: 100 checks between automatic sweeps
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export interface RateLimiterStats {
  trackedKeys: number;
  maxEntries: number;
  maxRequests: number;
  windowMs: number;
  evictions: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits: Map<string, number[]>;
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;
  private readonly purgeEveryChecks: number;
  private checkCounter = 0;
  private evictionsCount = 0;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.hits = new Map();
    this.maxRequests = Math.max(1, config.maxRequests ?? 30);
    this.windowMs = Math.max(1000, config.windowMs ?? 60 * 1000);
    this.maxEntries = Math.max(1, config.maxEntries ?? 10_000);
    this.purgeEveryChecks = Math.max(1, config.purgeEveryChecks ?? 100);
  }

  private computeResetSeconds(oldestTimestamp: number, now: number): number {
    return Math.max(1, Math.ceil((oldestTimestamp + this.windowMs - now) / 1000));
  }

  /**
   * Evaluates if the IP is allowed to proceed under the current sliding window.
   */
  check(ip: string): RateLimitResult {
    const key = ip.trim() || "unknown";
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (++this.checkCounter >= this.purgeEveryChecks) {
      this.checkCounter = 0;
      this.purgeStale(now);
    }

    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      // Persist pruned window and refresh LRU position for active blocked key
      this.hits.delete(key);
      this.hits.set(key, timestamps);

      const oldestInWindow = timestamps[0] ?? now;
      const resetSeconds = this.computeResetSeconds(oldestInWindow, now);

      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetSeconds,
      };
    }

    if (!this.hits.has(key) && this.hits.size >= this.maxEntries) {
      this.purgeStale(now);
      if (this.hits.size >= this.maxEntries) {
        const oldestKey = this.hits.keys().next().value;
        if (oldestKey !== undefined) {
          this.hits.delete(oldestKey);
          this.evictionsCount++;
        }
      }
    }

    // Record hit and refresh LRU insertion order
    timestamps.push(now);
    this.hits.delete(key);
    this.hits.set(key, timestamps);

    const remaining = this.maxRequests - timestamps.length;
    const oldestInWindow = timestamps[0] ?? now;
    const resetSeconds = this.computeResetSeconds(oldestInWindow, now);

    return {
      allowed: true,
      limit: this.maxRequests,
      remaining,
      resetSeconds,
    };
  }

  /**
   * Resets rate limiter memory and counters.
   */
  reset(): void {
    this.hits.clear();
    this.checkCounter = 0;
    this.evictionsCount = 0;
  }

  /**
   * Prunes expired IP buckets from memory.
   */
  purgeStale(now = Date.now()): number {
    const windowStart = now - this.windowMs;
    let purged = 0;
    for (const [ip, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        this.hits.delete(ip);
        purged++;
      } else {
        this.hits.set(ip, valid);
      }
    }
    return purged;
  }

  /**
   * Returns runtime capacity & saturation stats for health diagnostics.
   */
  getStats(): RateLimiterStats {
    return {
      trackedKeys: this.hits.size,
      maxEntries: this.maxEntries,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      evictions: this.evictionsCount,
    };
  }
}

export const globalRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
  maxEntries: 10_000,
  purgeEveryChecks: 100,
});

export const globalAdvisorRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  maxEntries: 10_000,
  purgeEveryChecks: 100,
});
