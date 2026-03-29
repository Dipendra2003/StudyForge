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

// Export singleton instance
export const quotaStore = new InMemoryQuotaStore();
