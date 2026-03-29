/**
 * AI Quiz Rate Limiter Middleware
 * 
 * Implements sliding window rate limiting for AI quiz generation endpoints.
 * Protects the system from API spam by throttling rapid repeated requests.
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

import type { Request, Response, NextFunction } from 'express';
import { Logger, LogCategory } from '../utils/logger';

/**
 * Configuration for the rate limiter
 */
export interface RateLimitConfig {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs: number;
  /** Maximum requests allowed per window (default: 5) */
  maxRequests: number;
  /** Function to generate a unique key for rate limiting (default: uses userId) */
  keyGenerator: (req: Request) => string | null;
}

/**
 * Internal tracking entry for rate limiting
 */
interface RateLimitEntry {
  /** Timestamps of requests within the current window */
  timestamps: number[];
}

/**
 * Default configuration for AI quiz rate limiting
 * 5 requests per minute per user
 * 
 * Requirements: 4.1
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  keyGenerator: (req: Request) => {
    // Extract userId from authenticated request
    const userId = req.user?.id;
    return userId ? `rate_limit:ai_quiz:${userId}` : null;
  },
};

/**
 * In-memory store for rate limit tracking
 * Uses sliding window algorithm for accurate rate limiting
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry>;
  private cleanupInterval: ReturnType<typeof setInterval> | null;

  constructor() {
    this.store = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Clean up every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);

    // Prevent interval from keeping Node.js process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Remove expired timestamps from all entries
   */
  private cleanup(): void {
    const now = Date.now();
    const windowMs = DEFAULT_CONFIG.windowMs;

    for (const [key, entry] of this.store.entries()) {
      // Filter out timestamps older than the window
      entry.timestamps = entry.timestamps.filter(ts => now - ts < windowMs);
      
      // Remove entry if no timestamps remain
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get the current request count within the sliding window
   * 
   * @param key - The rate limit key
   * @param windowMs - The window size in milliseconds
   * @returns The number of requests in the current window
   */
  getCount(key: string, windowMs: number): number {
    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }

    const now = Date.now();
    // Filter to only count timestamps within the window
    const validTimestamps = entry.timestamps.filter(ts => now - ts < windowMs);
    
    // Update the entry with filtered timestamps
    entry.timestamps = validTimestamps;
    
    return validTimestamps.length;
  }

  /**
   * Record a new request timestamp
   * 
   * @param key - The rate limit key
   * @param windowMs - The window size in milliseconds
   * @returns The new count after recording
   */
  increment(key: string, windowMs: number): number {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Filter out old timestamps and add new one
    entry.timestamps = entry.timestamps.filter(ts => now - ts < windowMs);
    entry.timestamps.push(now);

    return entry.timestamps.length;
  }

  /**
   * Get the oldest timestamp in the window (for calculating reset time)
   * 
   * @param key - The rate limit key
   * @param windowMs - The window size in milliseconds
   * @returns The oldest timestamp or null if no entries
   */
  getOldestTimestamp(key: string, windowMs: number): number | null {
    const entry = this.store.get(key);
    if (!entry || entry.timestamps.length === 0) {
      return null;
    }

    const now = Date.now();
    const validTimestamps = entry.timestamps.filter(ts => now - ts < windowMs);
    
    if (validTimestamps.length === 0) {
      return null;
    }

    return Math.min(...validTimestamps);
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Stop the cleanup interval (useful for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton store instance
const rateLimitStore = new RateLimitStore();

/**
 * Create AI quiz rate limiter middleware
 * 
 * Implements sliding window rate limiting:
 * - Tracks request timestamps per user
 * - Allows maxRequests within windowMs
 * - Returns HTTP 429 with Retry-After header when exceeded
 * 
 * @param config - Optional configuration overrides
 * @returns Express middleware function
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export function createAIQuizRateLimiter(
  config: Partial<RateLimitConfig> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const finalConfig: RateLimitConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Generate the rate limit key
    const key = finalConfig.keyGenerator(req);

    // If no key (unauthenticated user), skip rate limiting
    // The auth middleware should handle unauthenticated requests
    if (!key) {
      Logger.debug(LogCategory.SECURITY, 'Rate limiter skipped - no user ID', {
        path: req.path,
      });
      next();
      return;
    }

    const userId = req.user?.id;
    const currentCount = rateLimitStore.getCount(key, finalConfig.windowMs);

    // Check if rate limit exceeded
    if (currentCount >= finalConfig.maxRequests) {
      // Calculate retry-after time
      const oldestTimestamp = rateLimitStore.getOldestTimestamp(key, finalConfig.windowMs);
      const retryAfterMs = oldestTimestamp 
        ? (oldestTimestamp + finalConfig.windowMs) - Date.now()
        : finalConfig.windowMs;
      const retryAfterSeconds = Math.ceil(Math.max(retryAfterMs, 1000) / 1000);

      // Calculate reset timestamp
      const resetTimestamp = Math.ceil((Date.now() + retryAfterMs) / 1000);

      Logger.security('AI quiz rate limit exceeded', {
        userId,
        path: req.path,
        currentCount,
        maxRequests: finalConfig.maxRequests,
        retryAfterSeconds,
      });

      // Return HTTP 429 with standard rate limit headers
      res.status(429)
        .set({
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(finalConfig.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetTimestamp),
        })
        .json({
          success: false,
          error: 'Too many requests',
          message: 'Please wait before making another request',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: retryAfterSeconds,
        });
      return;
    }

    // Record this request
    const newCount = rateLimitStore.increment(key, finalConfig.windowMs);
    const remaining = Math.max(0, finalConfig.maxRequests - newCount);

    // Add rate limit headers to response
    res.set({
      'X-RateLimit-Limit': String(finalConfig.maxRequests),
      'X-RateLimit-Remaining': String(remaining),
    });

    Logger.debug(LogCategory.SECURITY, 'AI quiz rate limit check passed', {
      userId,
      path: req.path,
      currentCount: newCount,
      remaining,
      maxRequests: finalConfig.maxRequests,
    });

    next();
  };
}

/**
 * Pre-configured AI quiz rate limiter middleware
 * 5 requests per minute per user
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export const aiQuizRateLimiter = createAIQuizRateLimiter();

/**
 * AI-mode aware rate limiter middleware
 * 
 * Only applies rate limiting when aiMode=true query parameter is present.
 * This ensures non-AI quiz endpoints are NOT affected by rate limiting.
 * 
 * Requirements: 4.3, 4.4
 * - 4.3: THE Rate_Limiter SHALL apply to the AI quiz generation endpoint specifically
 * - 4.4: THE Rate_Limiter SHALL NOT affect other non-AI quiz endpoints
 * 
 * @param config - Optional configuration overrides
 * @returns Express middleware function
 */
export function createAIModeAwareRateLimiter(
  config: Partial<RateLimitConfig> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const rateLimiter = createAIQuizRateLimiter(config);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Only apply rate limiting when aiMode=true
    // This ensures database-only quiz requests are NOT rate limited
    const aiMode = req.query.aiMode;
    
    if (aiMode !== 'true') {
      Logger.debug(LogCategory.SECURITY, 'Rate limiter skipped - not AI mode', {
        path: req.path,
        aiMode,
      });
      next();
      return;
    }

    // Apply rate limiting for AI mode requests
    rateLimiter(req, res, next);
  };
}

/**
 * Pre-configured AI-mode aware rate limiter middleware
 * Only rate limits requests with aiMode=true query parameter
 * 5 requests per minute per user
 * 
 * Requirements: 4.3, 4.4
 */
export const aiModeAwareRateLimiter = createAIModeAwareRateLimiter();

/**
 * Export store for testing purposes
 */
export const _testRateLimitStore = rateLimitStore;
