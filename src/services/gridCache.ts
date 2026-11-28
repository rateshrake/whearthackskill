/**
 * VayuShield Backend Services
 * Module: gridCache.ts
 *
 * Implements:
 * 1. Coordinate Quantization: Rounds latitude and longitude to 0.01 degrees (~1.1 km spatial grid).
 * 2. Bounded LRU/TTL In-Memory Cache with eviction and purge capabilities.
 * 3. Specific TTL tiers:
 *    - STATION_TTL_MS: 30 minutes (Real-time ground station data)
 *    - FORECAST_TTL_MS: 60 minutes (48-hr forecasts and NASA FIRMS fire anomalies)
 */

import type { RawStationReading } from "./providers/groundStation";
import type { AirIntelligencePayload } from "./airQualityAggregator";
import type { UpwindFireQueryResult } from "./providers/upwindFire";
import type { AdvisorExecutionResult } from "./geminiAdvisor";

export const CACHE_TTL_MS = {
  STATION: 30 * 60 * 1000, // 30 minutes
  FORECAST: 60 * 60 * 1000, // 60 minutes
  FIRMS: 60 * 60 * 1000, // 60 minutes
  ADVISOR: 15 * 60 * 1000, // 15 minutes
} as const;

export interface QuantizedCoordinates {
  lat: number;
  lon: number;
  gridKey: string;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
}

export interface CacheStats {
  size: number;
  maxCapacity: number;
  hits: number;
  misses: number;
  evictions: number;
}

const normalizeZero = (value: number): number => (Object.is(value, -0) ? 0 : value);

/**
 * Quantizes GPS coordinates to a 0.01 degree grid (~1.1 km).
 * Rejects non-finite or out-of-range coordinates and normalizes -0 to +0.
 * Example: (28.613939, 77.209021) -> { lat: 28.61, lon: 77.21, gridKey: "28.61,77.21" }
 */
export function quantizeCoordinates(
  lat: number,
  lon: number,
  prefix?: string,
): QuantizedCoordinates {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new RangeError(`Invalid latitude for coordinate quantization: ${String(lat)}`);
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new RangeError(`Invalid longitude for coordinate quantization: ${String(lon)}`);
  }

  const roundedLat = normalizeZero(Number(lat.toFixed(2)));
  const roundedLon = normalizeZero(Number(lon.toFixed(2)));
  const baseKey = `${roundedLat.toFixed(2)},${roundedLon.toFixed(2)}`;
  const gridKey = prefix ? `${prefix}:${baseKey}` : baseKey;

  return {
    lat: roundedLat,
    lon: roundedLon,
    gridKey,
  };
}

/**
 * High-performance Bounded LRU/TTL In-Memory Cache.
 */
export class GridCache<T> {
  private readonly store: Map<string, CacheEntry<T>>;
  private readonly maxCapacity: number;
  private hitsCount = 0;
  private missesCount = 0;
  private evictionsCount = 0;
  private accessCounter = 0;

  constructor(maxCapacity = 1000) {
    this.store = new Map();
    this.maxCapacity = Math.max(1, maxCapacity);
  }

  /**
   * Retrieves an item from cache if present and unexpired.
   * Updates lastAccessed sequence for deterministic LRU ordering.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.missesCount++;
      return undefined;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.store.delete(key);
      this.missesCount++;
      return undefined;
    }

    // Refresh last accessed counter
    entry.lastAccessed = ++this.accessCounter;
    this.hitsCount++;
    return entry.value;
  }

  /**
   * Sets an item in the cache with a specified TTL in milliseconds.
   * Evicts least recently accessed entries if capacity is reached.
   */
  set(key: string, value: T, ttlMs: number): void {
    const now = Date.now();
    const expiresAt = now + Math.max(1000, ttlMs);

    // Evict if at capacity and key does not exist
    if (this.store.size >= this.maxCapacity && !this.store.has(key)) {
      this.evictLru();
    }

    this.store.set(key, {
      key,
      value,
      createdAt: now,
      expiresAt,
      lastAccessed: ++this.accessCounter,
    });
  }

  /**
   * Checks if an unexpired key exists.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Deletes a key from the cache.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clears the entire cache.
   */
  clear(): void {
    this.store.clear();
    this.hitsCount = 0;
    this.missesCount = 0;
    this.evictionsCount = 0;
    this.accessCounter = 0;
  }

  /**
   * Purges all expired entries.
   */
  purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        purged++;
      }
    }
    return purged;
  }

  /**
   * Returns cache runtime diagnostic metrics.
   */
  getStats(): CacheStats {
    return {
      size: this.store.size,
      maxCapacity: this.maxCapacity,
      hits: this.hitsCount,
      misses: this.missesCount,
      evictions: this.evictionsCount,
    };
  }

  /**
   * Evicts the single least recently accessed entry.
   */
  private evictLru(): void {
    let oldestKey: string | null = null;
    let oldestAccessTime = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < oldestAccessTime) {
        oldestAccessTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
      this.evictionsCount++;
    }
  }
}

// Global service singletons for Cloud Run instance lifecycle
export const globalStationCache = new GridCache<RawStationReading>(1000);
export const globalForecastCache = new GridCache<AirIntelligencePayload>(500);
export const globalFirmsCache = new GridCache<UpwindFireQueryResult>(500);
export const globalAdvisorCache = new GridCache<AdvisorExecutionResult>(500);
