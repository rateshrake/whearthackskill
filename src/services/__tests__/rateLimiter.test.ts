import { describe, it, expect, beforeEach } from "vitest";
import { SlidingWindowRateLimiter } from "../rateLimiter";

describe("Service 2: rateLimiter", () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter({
      maxRequests: 3, // Small limit for testing
      windowMs: 1000,
    });
  });

  it("should allow requests up to the maximum limit", () => {
    const ip = "192.168.1.10";

    const r1 = limiter.check(ip);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check(ip);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check(ip);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("should reject requests exceeding maximum limit with resetSeconds", () => {
    const ip = "192.168.1.20";

    limiter.check(ip);
    limiter.check(ip);
    limiter.check(ip);

    // 4th request exceeds max 3
    const r4 = limiter.check(ip);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetSeconds).toBeGreaterThan(0);
  });

  it("should maintain independent limits per IP address", () => {
    const ipA = "10.0.0.1";
    const ipB = "10.0.0.2";

    limiter.check(ipA);
    limiter.check(ipA);
    limiter.check(ipA);

    expect(limiter.check(ipA).allowed).toBe(false);
    expect(limiter.check(ipB).allowed).toBe(true);
  });

  it("should purge stale IPs and reset memory cleanly", () => {
    limiter.check("1.1.1.1");
    limiter.purgeStale();
    limiter.reset();
    expect(limiter.check("1.1.1.1").remaining).toBe(2);
  });
});
