/**
 * Quota Store Service
 * 
 * Provides storage abstraction for tracking per-user AI usage quotas.
 * Implements TTL-based expiration for automatic quota reset.
 * 
 * Requirements: 5.1, 5.2, 5.3
 */

import { Logger, LogCategory } from "../utils/logger";

/**
 * A quota entry containing usage count and window information
 */
export interface QuotaEntry {
  /** Number of AI quizzes generated in this window */
  count: number;
  /** Unix timestamp of window start */
  windowStart: number;
}

/**
 * Interface for quota storage backends
 * 
 * Supports both in-memory and Redis implementations.
 * All methods are async to support both sync and async backends.
 * 
 * Requirements: 5.4
 */
export interface QuotaStore {
  /**
   * Get a quota entry by key
   * @param key - The quota key (format: ai_quota:{userId}:{hourWindow})
   * @returns The quota entry if exists and not expired, null otherwise
   */
  get(key: string): Promise<QuotaEntry | null>;

  /**
   * Set a quota entry with TTL
   * @param key - The quota key
   * @param entry - The quota entry to store
   * @param ttlMs - Time-to-live in milliseconds
   */
  set(key: string, entry: QuotaEntry, ttlMs: number): Promise<void>;

  /**
   * Increment the count for a quota entry, creating if not exists
   * @param key - The quota key
   * @param ttlMs - Time-to-live in milliseconds (used if creating new entry)
   * @returns The new count after increment
   */
  increment(key: string, ttlMs: number): Promise<number>;

  /**
   * Delete a quota entry
   * @param key - The quota key to delete
   */
  delete(key: string): Promise<void>;
}

/**
 * Internal storage entry with TTL tracking
 */
interface StoredEntry {
  entry: QuotaEntry;
  expiresAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * In-memory implementation of QuotaStore
 * 
 * Uses setTimeout for TTL-based expiration.
 * Suitable for single-instance deployments.
 * 
 * Requirements: 5.1, 5.2, 5.3
 */
export class InMemoryQuotaStore implements QuotaStore {
  private store: Map<string, StoredEntry>;

  constructor() {
    this.store = new Map();
  }

  /**
   * Generate a quota key from userId and hour window
   * 
   * Key format: ai_quota:{userId}:{hourWindow}
   * Where hourWindow is calculated as Math.floor(Date.now() / 3600000)
   * 
   * @param userId - The user ID
   * @returns The formatted quota key
   * 
   * Requirements: 5.2
   */
  static generateKey(userId: number): string {
    const hourWindow = Math.floor(Date.now() / 3600000);
    return `ai_quota:${userId}:${hourWindow}`;
  }

  /**
   * Get a quota entry by key
   * 
   * Returns null if entry doesn't exist or has expired.
   * Expired entries are automatically cleaned up by setTimeout.
   * 
   * @param key - The quota key
   * @returns The quota entry or null
   * 
   * Requirements: 5.1
   */
  async get(key: string): Promise<QuotaEntry | null> {
    const stored = this.store.get(key);
    
    if (!stored) {
      return null;
    }

    // Double-check expiration (in case setTimeout hasn't fired yet)
    if (Date.now() >= stored.expiresAt) {
      this.deleteInternal(key);
      return null;
    }

    return { ...stored.entry };
  }

  /**
   * Set a quota entry with TTL-based expiration
   * 
   * Creates or updates an entry with automatic expiration using setTimeout.
   * If entry already exists, clears the old timeout before setting new one.
   * 
   * @param key - The quota key
   * @param entry - The quota entry to store
   * @param ttlMs - Time-to-live in milliseconds
   * 
   * Requirements: 5.1, 5.3
   */
  async set(key: string, entry: QuotaEntry, ttlMs: number): Promise<void> {
    // Clear existing timeout if entry exists
    const existing = this.store.get(key);
    if (existing) {
      clearTimeout(existing.timeoutId);
    }

    const expiresAt = Date.now() + ttlMs;
    
    // Set up automatic expiration
    const timeoutId = setTimeout(() => {
      this.deleteInternal(key);
      Logger.info(LogCategory.CACHE, 'Quota entry expired', {
        quotaKey: key,
        ttlMs,
      });
    }, ttlMs);

    // Prevent timeout from keeping Node.js process alive
    if (timeoutId.unref) {
      timeoutId.unref();
    }

    this.store.set(key, {
      entry: { ...entry },
      expiresAt,
      timeoutId,
    });
  }

  /**
   * Increment the count for a quota entry
   * 
   * If entry doesn't exist, creates a new one with count=1.
   * If entry exists, increments the count and preserves TTL.
   * 
   * @param key - The quota key
   * @param ttlMs - Time-to-live in milliseconds (used for new entries)
   * @returns The new count after increment
   * 
   * Requirements: 5.1
   */
  async increment(key: string, ttlMs: number): Promise<number> {
    const existing = this.store.get(key);
    
    if (!existing || Date.now() >= existing.expiresAt) {
      // Create new entry with count=1
      const newEntry: QuotaEntry = {
        count: 1,
        windowStart: Date.now(),
      };
      await this.set(key, newEntry, ttlMs);
      return 1;
    }

    // Increment existing entry
    existing.entry.count += 1;
    return existing.entry.count;
  }

  /**
   * Delete a quota entry
   * 
   * Clears the associated timeout and removes from store.
   * 
   * @param key - The quota key to delete
   */
  async delete(key: string): Promise<void> {
    this.deleteInternal(key);
  }

  /**
   * Internal delete method (synchronous)
   * 
   * @param key - The quota key to delete
   */
  private deleteInternal(key: string): void {
    const stored = this.store.get(key);
    if (stored) {
      clearTimeout(stored.timeoutId);
      this.store.delete(key);
    }
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    for (const [key, stored] of this.store.entries()) {
      clearTimeout(stored.timeoutId);
    }
    this.store.clear();
  }

  /**
   * Get the current number of entries (useful for testing)
   */
  get size(): number {
    return this.store.size;
  }
}

/**
 * Redis-backed implementation of QuotaStore for distributed multi-container deployments
 */
export class RedisQuotaStore implements QuotaStore {
  async get(key: string): Promise<QuotaEntry | null> {
    const { isRedisAvailable, redisClient } = await import('../db/index');
    if (!isRedisAvailable() || !redisClient) return null;
    const raw = await redisClient.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as QuotaEntry;
    } catch {
      return null;
    }
  }

  async set(key: string, entry: QuotaEntry, ttlMs: number): Promise<void> {
    const { isRedisAvailable, redisClient } = await import('../db/index');
    if (!isRedisAvailable() || !redisClient) return;
    await redisClient.set(key, JSON.stringify(entry), {
      PX: ttlMs
    });
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    const { isRedisAvailable, redisClient } = await import('../db/index');
    if (!isRedisAvailable() || !redisClient) return 1;
    const current = await this.get(key);
    if (!current) {
      const newEntry: QuotaEntry = {
        count: 1,
        windowStart: Date.now(),
      };
      await this.set(key, newEntry, ttlMs);
      return 1;
    }
    current.count += 1;
    await this.set(key, current, ttlMs);
    return current.count;
  }

  async delete(key: string): Promise<void> {
    const { isRedisAvailable, redisClient } = await import('../db/index');
    if (!isRedisAvailable() || !redisClient) return;
    await redisClient.del(key);
  }
}

/**
 * Dynamic Quota Store
 * Uses Redis when connected; transparently falls back to in-memory store if Redis is unavailable.
 */
export class DynamicQuotaStore implements QuotaStore {
  private inMemory: InMemoryQuotaStore;
  private redis: RedisQuotaStore;

  constructor() {
    this.inMemory = new InMemoryQuotaStore();
    this.redis = new RedisQuotaStore();
  }

  static generateKey(userId: number): string {
    return InMemoryQuotaStore.generateKey(userId);
  }

  async get(key: string): Promise<QuotaEntry | null> {
    try {
      const { isRedisAvailable } = await import('../db/index');
      if (isRedisAvailable()) {
        const entry = await this.redis.get(key);
        if (entry) return entry;
      }
    } catch (err) {
      Logger.warn(LogCategory.CACHE, 'Redis quota get failed, falling back to in-memory', { error: (err as Error).message });
    }
    return this.inMemory.get(key);
  }

  async set(key: string, entry: QuotaEntry, ttlMs: number): Promise<void> {
    try {
      const { isRedisAvailable } = await import('../db/index');
      if (isRedisAvailable()) {
        await this.redis.set(key, entry, ttlMs);
      }
    } catch (err) {
      Logger.warn(LogCategory.CACHE, 'Redis quota set failed, falling back to in-memory', { error: (err as Error).message });
    }
    // Always mirror to in-memory as safety fallback
    await this.inMemory.set(key, entry, ttlMs);
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    try {
      const { isRedisAvailable } = await import('../db/index');
      if (isRedisAvailable()) {
        const val = await this.redis.increment(key, ttlMs);
        await this.inMemory.set(key, { count: val, windowStart: Date.now() }, ttlMs);
        return val;
      }
    } catch (err) {
      Logger.warn(LogCategory.CACHE, 'Redis quota increment failed, falling back to in-memory', { error: (err as Error).message });
    }
    return this.inMemory.increment(key, ttlMs);
  }

  async delete(key: string): Promise<void> {
    try {
      const { isRedisAvailable } = await import('../db/index');
      if (isRedisAvailable()) {
        await this.redis.delete(key);
      }
    } catch (err) {
      Logger.warn(LogCategory.CACHE, 'Redis quota delete failed', { error: (err as Error).message });
    }
    await this.inMemory.delete(key);
  }

  clear(): void {
    this.inMemory.clear();
  }

  get size(): number {
    return this.inMemory.size;
  }
}

// Export singleton instance with Redis + in-memory fallback
export const quotaStore = new DynamicQuotaStore();
