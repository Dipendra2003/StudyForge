/**
 * Quiz Cache Service
 * 
 * Provides in-memory caching for AI-generated quiz questions to minimize
 * redundant AI API calls. When identical quiz configurations are requested,
 * the system returns cached questions instead of making new AI calls.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3
 * Rate Limiting Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4
 */

import type { Question } from "../../shared/quiz-types";
import { cacheKeyGenerator } from "./cache-key-generator";
import { batchQuizGenerator, type BatchQuizRequest } from "./batch-quiz-generator";
import { Logger, LogCategory } from "../utils/logger";
import { aiQuotaService } from "./ai-quota.service";
import { questionService } from "./question.service";

/**
 * Configuration for the quiz cache
 */
export interface CacheConfig {
  /** Time-to-live in milliseconds (default: 3600000 = 1 hour) */
  ttlMs: number;
  /** Maximum number of cache entries (default: 1000) */
  maxSize: number;
}

/**
 * A cached entry containing quiz questions and metadata
 */
export interface CacheEntry {
  /** The cached quiz questions */
  questions: Question[];
  /** Unix timestamp when entry was created */
  createdAt: number;
  /** Unix timestamp of last access (for LRU eviction) */
  lastAccessedAt: number;
  /** TTL in milliseconds for this entry */
  ttlMs: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Current number of entries in cache */
  size: number;
  /** Total number of cache hits */
  hits: number;
  /** Total number of cache misses */
  misses: number;
}

/**
 * Response from cache-aware quiz generation
 * 
 * Requirements: 3.1, 3.2, 5.3
 * Rate Limiting Requirements: 3.1, 3.2, 3.3, 3.4
 */
export interface CachedQuizResponse {
  /** The quiz questions */
  questions: Question[];
  /** Source of the questions: 'ai', 'database', 'cache', or 'mixed' */
  source: 'ai' | 'database' | 'cache' | 'mixed';
  /** Time taken to generate/retrieve questions in milliseconds */
  generationTimeMs: number;
  /** Whether the response came from cache */
  cacheHit: boolean;
}

/**
 * Get cache configuration from environment variables with defaults
 * 
 * Reads QUIZ_CACHE_TTL_MS and QUIZ_CACHE_MAX_SIZE from environment.
 * Falls back to defaults if not set or invalid.
 * 
 * Requirements: 7.1, 7.2
 */
function getCacheConfigFromEnv(): CacheConfig {
  const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
  const DEFAULT_MAX_SIZE = 1000;

  // Read TTL from environment (Requirement 7.1)
  const envTtlMs = process.env.QUIZ_CACHE_TTL_MS;
  let ttlMs = DEFAULT_TTL_MS;
  if (envTtlMs) {
    const parsed = parseInt(envTtlMs, 10);
    if (!isNaN(parsed) && parsed > 0) {
      ttlMs = parsed;
    }
  }

  // Read max size from environment (Requirement 7.2)
  const envMaxSize = process.env.QUIZ_CACHE_MAX_SIZE;
  let maxSize = DEFAULT_MAX_SIZE;
  if (envMaxSize) {
    const parsed = parseInt(envMaxSize, 10);
    if (!isNaN(parsed) && parsed > 0) {
      maxSize = parsed;
    }
  }

  return { ttlMs, maxSize };
}

/**
 * Default cache configuration (loaded from environment variables)
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = getCacheConfigFromEnv();

/**
 * Quiz Cache Service class
 * 
 * Manages an in-memory cache of validated AI-generated quiz questions.
 * Implements TTL-based expiration and tracks cache statistics.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export class QuizCacheService {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private hits: number;
  private misses: number;

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.config = {
      ...DEFAULT_CACHE_CONFIG,
      ...config,
    };
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get a cache entry if it exists and is not expired
   * 
   * Checks if the entry exists and has not exceeded its TTL.
   * Updates lastAccessedAt on successful retrieval.
   * 
   * @param key - The cache key to look up
   * @returns The cache entry if valid, null otherwise
   * 
   * Requirements: 2.3 (automatic expiration), 6.4 (log expiration)
   */
  getCacheEntry(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    const age = now - entry.createdAt;
    
    if (age >= entry.ttlMs) {
      // Entry has expired, remove it and log (Requirement 6.4)
      this.cache.delete(key);
      Logger.info(LogCategory.CACHE, 'Cache entry expired', { 
        cacheKey: key,
        ageMs: age,
        ttlMs: entry.ttlMs,
      });
      this.misses++;
      return null;
    }

    // Update last accessed time for LRU tracking
    entry.lastAccessedAt = now;
    this.hits++;
    
    return entry;
  }

  /**
   * Store validated questions in the cache
   * 
   * Creates a new cache entry with the current timestamp and configured TTL.
   * Only stores fully validated Question[] objects.
   * Performs LRU eviction if cache is at maximum capacity before adding.
   * 
   * @param key - The cache key
   * @param questions - Array of validated Question objects to cache
   * 
   * Requirements: 2.1 (store only validated questions), 2.2 (configurable TTL), 7.2, 7.3 (LRU eviction)
   */
  setCacheEntry(key: string, questions: Question[]): void {
    // Evict if needed before adding new entry (only if key doesn't already exist)
    if (!this.cache.has(key)) {
      this.evictIfNeeded();
    }

    const now = Date.now();
    
    const entry: CacheEntry = {
      questions,
      createdAt: now,
      lastAccessedAt: now,
      ttlMs: this.config.ttlMs,
    };

    this.cache.set(key, entry);
  }

  /**
   * Evict the least recently accessed entry if cache is at maximum capacity
   * 
   * Implements LRU (Least Recently Used) eviction strategy.
   * When the cache reaches maxSize, removes the entry with the oldest lastAccessedAt timestamp.
   * 
   * @returns The key of the evicted entry, or null if no eviction was needed
   * 
   * Requirements: 7.2 (configurable max size), 7.3 (LRU eviction)
   */
  evictIfNeeded(): string | null {
    // No eviction needed if cache is below max size
    if (this.cache.size < this.config.maxSize) {
      return null;
    }

    // Find the least recently accessed entry
    let oldestKey: string | null = null;
    let oldestAccessTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestAccessTime) {
        oldestAccessTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    // Evict the oldest entry
    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
      return oldestKey;
    }

    return null;
  }

  /**
   * Remove all expired entries from the cache
   * 
   * Iterates through all entries and removes those that have exceeded their TTL.
   * 
   * @returns Number of entries removed
   * 
   * Requirements: 2.3 (automatic expiration), 6.4 (log expiration)
   */
  clearExpired(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.createdAt;
      if (age >= entry.ttlMs) {
        this.cache.delete(key);
        Logger.info(LogCategory.CACHE, 'Cache entry expired', { 
          cacheKey: key,
          ageMs: age,
          ttlMs: entry.ttlMs,
        });
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get cache statistics for monitoring
   * 
   * Returns current cache size and hit/miss counts.
   * 
   * @returns Cache statistics object
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Generate quiz with caching support
   * 
   * Flow order (Rate Limiting Requirements 2.1, 2.2, 2.3, 2.4):
   * 1. Check quota FIRST - if exceeded, skip to database fallback
   * 2. Check cache - if hit, return cached questions
   * 3. AI generation - if quota available and cache miss
   * 4. Increment quota - only on successful AI generation
   * 
   * Checks cache first, falls back to AI generation on miss.
   * Only caches AI-generated questions (not database fallback).
   * 
   * @param request - The batch quiz request parameters
   * @returns CachedQuizResponse with questions, source, and cache hit flag
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3
   * Rate Limiting Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4
   */
  async generateQuizWithCache(request: BatchQuizRequest): Promise<CachedQuizResponse> {
    const startTime = Date.now();
    
    // STEP 1: Check quota FIRST (Rate Limiting Requirement 2.1)
    // This must happen before any cache lookup or AI call
    const quotaStatus = await aiQuotaService.checkQuota(request.userId);
    
    // If quota exceeded, skip AI generation and go directly to database fallback
    // (Rate Limiting Requirements 2.3, 2.4, 3.1, 3.2, 3.3, 3.4)
    if (quotaStatus.exceeded) {
      Logger.info(LogCategory.AI, 'Quota exceeded, using database fallback', {
        userId: request.userId,
        quotaUsed: quotaStatus.used,
        quotaRemaining: quotaStatus.remaining,
      });
      
      return this.fallbackToDatabase(request, startTime);
    }
    
    // Generate deterministic cache key from request parameters
    const cacheKey = cacheKeyGenerator.generate({
      category: request.category,
      topic: request.topic,
      difficulty: request.difficulty,
      questionTypes: request.questionTypes,
      questionCount: request.questionCount,
    });

    // STEP 2: Check cache (Requirement 3.1)
    const cachedEntry = this.getCacheEntry(cacheKey);
    
    if (cachedEntry) {
      // Cache hit - return cached questions immediately (Requirements 3.2, 6.1)
      // Do NOT increment quota on cache hits (Rate Limiting Requirement 6.2)
      Logger.info(LogCategory.CACHE, 'Cache hit', { cacheKey });
      
      const generationTimeMs = Date.now() - startTime;
      
      return {
        questions: cachedEntry.questions,
        source: 'cache', // Requirement 5.3: mark source as 'cache'
        generationTimeMs,
        cacheHit: true,
      };
    }

    // STEP 3: Cache miss - proceed with AI generation (Requirements 3.3, 6.2)
    Logger.info(LogCategory.CACHE, 'Cache miss', { cacheKey });
    
    // Call batch quiz generator
    const result = await batchQuizGenerator.generateBatch(request);
    
    // STEP 4: Only cache AI-generated questions, not database fallback (Requirements 5.1, 5.2, 6.3)
    if (result.source === 'ai') {
      this.setCacheEntry(cacheKey, result.questions);
      Logger.info(LogCategory.CACHE, 'Cache entry created', { 
        cacheKey, 
        ttlMs: this.config.ttlMs,
        questionCount: result.questions.length,
      });
      
      // Increment quota ONLY on successful AI generation (Rate Limiting Requirement 6.1)
      // Do NOT increment on cache hits, database fallback, or failed AI attempts
      await aiQuotaService.incrementQuota(request.userId);
    }
    // Note: Do NOT increment quota on database fallback (Rate Limiting Requirement 6.3)

    // Return response with cacheHit flag (Requirement 3.4)
    return {
      questions: result.questions,
      source: result.source,
      generationTimeMs: result.generationTimeMs,
      cacheHit: false,
    };
  }
  
  /**
   * Fallback to database questions when quota is exceeded or AI fails
   * 
   * Returns database questions with source='database'.
   * Does NOT throw errors or expose quota information.
   * 
   * @param request - The batch quiz request parameters
   * @param startTime - Start time for timing calculation
   * @returns CachedQuizResponse with database questions
   * 
   * Rate Limiting Requirements: 3.1, 3.2, 3.3, 3.4
   */
  private async fallbackToDatabase(
    request: BatchQuizRequest,
    startTime: number
  ): Promise<CachedQuizResponse> {
    try {
      // Query database for questions matching the request parameters
      const dbQuestions = await questionService.getQuestions({
        category: request.category,
        difficulty: request.difficulty,
        questionTypes: request.questionTypes,
        limit: request.questionCount,
        isPublic: true,
      });
      
      const generationTimeMs = Date.now() - startTime;
      
      // If we have enough questions, return them
      if (dbQuestions.length >= request.questionCount) {
        Logger.info(LogCategory.AI, 'Database fallback successful', {
          questionCount: dbQuestions.length,
          generationTimeMs,
          source: 'database',
        });
        
        return {
          questions: dbQuestions,
          source: 'database', // Rate Limiting Requirement 3.2
          generationTimeMs,
          cacheHit: false,
        };
      }
      
      // If not enough questions, try without category filter
      const anyQuestions = await questionService.getQuestions({
        difficulty: request.difficulty,
        questionTypes: request.questionTypes,
        limit: request.questionCount,
        isPublic: true,
      });
      
      if (anyQuestions.length >= request.questionCount) {
        Logger.info(LogCategory.AI, 'Database fallback successful (any category)', {
          questionCount: anyQuestions.length,
          generationTimeMs: Date.now() - startTime,
          source: 'database',
        });
        
        return {
          questions: anyQuestions,
          source: 'database',
          generationTimeMs: Date.now() - startTime,
          cacheHit: false,
        };
      }
      
      // Return whatever we have, even if less than requested
      // Do NOT throw errors (Rate Limiting Requirement 3.4)
      const availableQuestions = dbQuestions.length > 0 ? dbQuestions : anyQuestions;
      
      Logger.warn(LogCategory.AI, 'Database fallback returned fewer questions than requested', {
        requested: request.questionCount,
        returned: availableQuestions.length,
      });
      
      return {
        questions: availableQuestions,
        source: 'database',
        generationTimeMs: Date.now() - startTime,
        cacheHit: false,
      };
    } catch (error) {
      // Log the error but do NOT throw (Rate Limiting Requirement 3.4)
      Logger.error(LogCategory.AI, 'Database fallback failed', error as Error, {
        userId: request.userId,
        category: request.category,
      });
      
      // Return empty array rather than throwing
      // This ensures the user experience is not interrupted
      return {
        questions: [],
        source: 'database',
        generationTimeMs: Date.now() - startTime,
        cacheHit: false,
      };
    }
  }

  /**
   * Check if a cache entry exists (without updating stats or lastAccessedAt)
   * 
   * @param key - The cache key to check
   * @returns True if a valid (non-expired) entry exists
   * 
   * Requirement: 6.4 (log expiration)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    const now = Date.now();
    const age = now - entry.createdAt;
    
    if (age >= entry.ttlMs) {
      // Entry has expired, remove it and log (Requirement 6.4)
      this.cache.delete(key);
      Logger.info(LogCategory.CACHE, 'Cache entry expired', { 
        cacheKey: key,
        ageMs: age,
        ttlMs: entry.ttlMs,
      });
      return false;
    }

    return true;
  }

  /**
   * Delete a specific cache entry
   * 
   * @param key - The cache key to delete
   * @returns True if an entry was deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get the current cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Get the current cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

// Export singleton instance with default configuration
export const quizCacheService = new QuizCacheService();
