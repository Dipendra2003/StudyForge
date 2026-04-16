/**
 * Analytics Caching Service
 * Provides in-memory caching for analytics data with TTL
 * Requirements: 6.9, 18.2
 */

import { Logger, LogCategory } from '../utils/logger';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Analytics Cache Service
 * Implements in-memory cache with 5-minute TTL for analytics metrics
 * Requirements: 6.9, 18.2
 */
class AnalyticsCacheService {
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor() {
    this.cache = new Map();
    
    // Start periodic cleanup of expired entries (every 10 minutes)
    this.startCleanupInterval();
  }

  /**
   * Get cached value by key
   * Returns null if key doesn't exist or entry has expired
   * Requirements: 6.9, 18.2
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      Logger.debug(LogCategory.PERFORMANCE, 'Cache miss', { key });
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    const age = now - entry.timestamp;
    
    if (age > this.DEFAULT_TTL) {
      // Entry expired, remove it
      this.cache.delete(key);
      Logger.debug(LogCategory.PERFORMANCE, 'Cache expired', { 
        key, 
        age: Math.round(age / 1000) + 's' 
      });
      return null;
    }

    Logger.debug(LogCategory.PERFORMANCE, 'Cache hit', { 
      key, 
      age: Math.round(age / 1000) + 's' 
    });
    return entry.data as T;
  }

  /**
   * Set cached value with key
   * Uses default 5-minute TTL
   * Requirements: 6.9, 18.2
   */
  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };

    this.cache.set(key, entry);
    
    Logger.debug(LogCategory.PERFORMANCE, 'Cache set', { 
      key,
      ttl: this.DEFAULT_TTL / 1000 + 's'
    });
  }

  /**
   * Set cached value with custom TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttlMs TTL in milliseconds
   */
  setWithTTL<T>(key: string, data: T, ttlMs: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };

    this.cache.set(key, entry);
    
    Logger.debug(LogCategory.PERFORMANCE, 'Cache set with custom TTL', { 
      key,
      ttl: ttlMs / 1000 + 's'
    });

    // Schedule automatic removal after TTL
    setTimeout(() => {
      if (this.cache.has(key)) {
        const currentEntry = this.cache.get(key);
        // Only delete if it's the same entry (not replaced)
        if (currentEntry === entry) {
          this.cache.delete(key);
          Logger.debug(LogCategory.PERFORMANCE, 'Cache entry auto-removed', { key });
        }
      }
    }, ttlMs);
  }

  /**
   * Clear specific cache entry
   * Requirements: 6.9
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      Logger.debug(LogCategory.PERFORMANCE, 'Cache entry deleted', { key });
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   * Requirements: 6.9
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    
    Logger.info(LogCategory.PERFORMANCE, 'Cache cleared', { 
      entriesCleared: size 
    });
  }

  /**
   * Clear cache entries matching a pattern
   * @param pattern String pattern to match (supports wildcards with *)
   */
  clearPattern(pattern: string): number {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let cleared = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      Logger.info(LogCategory.PERFORMANCE, 'Cache pattern cleared', { 
        pattern,
        entriesCleared: cleared 
      });
    }

    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const keys = Array.from(this.cache.keys());
    const entries = Array.from(this.cache.values());
    
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;

    if (entries.length > 0) {
      const timestamps = entries.map(e => e.timestamp);
      oldestTimestamp = Math.min(...timestamps);
      newestTimestamp = Math.max(...timestamps);
    }

    return {
      size: this.cache.size,
      keys,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp,
    };
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.DEFAULT_TTL) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Start periodic cleanup of expired entries
   * Runs every 10 minutes to remove stale entries
   */
  private startCleanupInterval(): void {
    const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

    setInterval(() => {
      this.cleanupExpired();
    }, CLEANUP_INTERVAL);

    Logger.info(LogCategory.PERFORMANCE, 'Cache cleanup interval started', {
      interval: CLEANUP_INTERVAL / 1000 + 's'
    });
  }

  /**
   * Remove all expired entries from cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.DEFAULT_TTL) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      Logger.debug(LogCategory.PERFORMANCE, 'Cache cleanup completed', {
        entriesRemoved: removed,
        remainingEntries: this.cache.size,
      });
    }
  }
}

// Export singleton instance
export const analyticsCacheService = new AnalyticsCacheService();
