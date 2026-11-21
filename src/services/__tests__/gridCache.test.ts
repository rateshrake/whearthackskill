import { describe, it, expect, beforeEach } from "vitest";
import { quantizeCoordinates, GridCache, CACHE_TTL_MS } from "../gridCache";

describe("Service 1: gridCache", () => {
  describe("Coordinate Quantization (0.01° Grid ~ 1.1 km)", () => {
    it("should round lat and lon to exact 0.01 degree boundaries", () => {
      // Delhi Connaught Place
      const q1 = quantizeCoordinates(28.63152, 77.216721);
      expect(q1.lat).toBe(28.63);
      expect(q1.lon).toBe(77.22);
      expect(q1.gridKey).toBe("28.63,77.22");

      // Delhi Anand Vihar micro-hotspot
      const q2 = quantizeCoordinates(28.64687, 77.31604, "delhi");
      expect(q2.lat).toBe(28.65);
      expect(q2.lon).toBe(77.32);
      expect(q2.gridKey).toBe("delhi:28.65,77.32");
    });

    it("should handle boundary float precision cleanly", () => {
      const q = quantizeCoordinates(0.0049, -0.0051);
      expect(q.lat).toBe(0.0);
      expect(q.lon).toBe(-0.01);
    });
  });

  describe("Bounded LRU/TTL Cache Behavior", () => {
    let cache: GridCache<string>;

    beforeEach(() => {
      cache = new GridCache<string>(3); // Small capacity for LRU test
    });

    it("should store and retrieve unexpired items (Cache Hit)", () => {
      cache.set("key1", "value1", CACHE_TTL_MS.STATION);
      expect(cache.has("key1")).toBe(true);
      expect(cache.get("key1")).toBe("value1");

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(1);
    });

    it("should expire items after TTL elapsed (Cache Miss)", () => {
      // Set short 10ms TTL
      cache.set("key_short", "temp_value", 10);
      expect(cache.get("key_short")).toBe("temp_value");

      // Artificially simulate time progression
      const entry = (
        cache as unknown as { store: Map<string, { expiresAt: number }> }
      ).store.get("key_short");
      if (entry) {
        entry.expiresAt = Date.now() - 500; // Force expired
      }

      expect(cache.has("key_short")).toBe(false);
      expect(cache.get("key_short")).toBeUndefined();
      expect(cache.getStats().misses).toBe(1);
    });

    it("should evict least recently accessed entry when capacity is exceeded", () => {
      cache.set("k1", "v1", 60000);
      cache.set("k2", "v2", 60000);
      cache.set("k3", "v3", 60000);

      // Access k1 and k3, leaving k2 as least recently used
      cache.get("k1");
      cache.get("k3");

      // Insert k4, exceeding capacity 3 -> should evict k2
      cache.set("k4", "v4", 60000);

      expect(cache.has("k1")).toBe(true);
      expect(cache.has("k3")).toBe(true);
      expect(cache.has("k4")).toBe(true);
      expect(cache.has("k2")).toBe(false); // Evicted!

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
      expect(stats.size).toBe(3);
    });

    it("should purge expired items and support clear/delete", () => {
      cache.set("p1", "val1", 10);
      cache.set("p2", "val2", 60000);

      const store = (cache as unknown as { store: Map<string, { expiresAt: number }> })
        .store;
      const p1 = store.get("p1");
      if (p1) p1.expiresAt = Date.now() - 1000;

      const purgedCount = cache.purgeExpired();
      expect(purgedCount).toBe(1);
      expect(cache.has("p1")).toBe(false);
      expect(cache.has("p2")).toBe(true);

      expect(cache.delete("p2")).toBe(true);
      expect(cache.has("p2")).toBe(false);

      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });
});
