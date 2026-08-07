/**
 * AI Quota Service
 * 
 * Tracks and enforces per-user AI usage limits for quiz generation.
 * Implements quota checking, incrementing, and status reporting.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { Logger, LogCategory } from "../utils/logger";
import { QuotaStore, InMemoryQuotaStore, quotaStore } from "./quota-store";

/**
 * Configuration for quota limits
 */
export interface QuotaConfig {
  /** Maximum AI quiz generations per hour (default: 3) */
  maxQuizzesPerHour: number;
  /** Maximum questions per quiz request (default: 20) */
  maxQuestionsPerQuiz: number;
  /** Time window in milliseconds (default: 3600000 = 1 hour) */
  windowMs: number;
}

/**
 * Status of a user's quota
 */
export interface QuotaStatus {
  /** The user ID */
  userId: number;
  /** Number of AI quizzes used in current window */
  used: number;
  /** Number of AI quizzes remaining in current window */
  remaining: number;
  /** Unix timestamp when quota resets */
  resetAt: number;
  /** Whether the quota has been exceeded */
  exceeded: boolean;
}

/**
 * Default quota configuration
 * 
 * Requirements: 1.1, 1.2
 */
const DEFAULT_CONFIG: QuotaConfig = {
  maxQuizzesPerHour: 3,
  maxQuestionsPerQuiz: 20,
  windowMs: 3600000, // 1 hour in milliseconds
};

/**
 * AI Quota Service
 * 
 * Responsible for tracking and enforcing per-user AI usage limits.
 * Uses QuotaStore for persistence with TTL-based expiration.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export class AIQuotaService {
  private store: QuotaStore;
  private config: QuotaConfig;

  constructor(store?: QuotaStore, config?: Partial<QuotaConfig>) {
    this.store = store || quotaStore;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a quota key for a user
   * 
   * Key format: ai_quota:{userId}:{hourWindow}
   * 
   * @param userId - The user ID
   * @returns The formatted quota key
   * 
   * Requirements: 1.4
   */
  private generateKey(userId: number): string {
    const hourWindow = Math.floor(Date.now() / this.config.windowMs);
    return `ai_quota:${userId}:${hourWindow}`;
  }

  /**
   * Calculate when the current quota window resets
   * 
   * @returns Unix timestamp of next reset
   */
  private calculateResetTime(): number {
    const currentWindow = Math.floor(Date.now() / this.config.windowMs);
    return (currentWindow + 1) * this.config.windowMs;
  }

  /**
   * Check if a user has available quota for AI quiz generation
   * 
   * This should be called as the FIRST step before any cache lookup or AI call.
   * Returns quota status without modifying the quota.
   * 
   * @param userId - The user ID to check
   * @returns QuotaStatus indicating availability
   * 
   * Requirements: 1.1, 1.3, 1.4
   */
  async checkQuota(userId: number): Promise<QuotaStatus> {
    const key = this.generateKey(userId);
    const entry = await this.store.get(key);
    
    const used = entry?.count || 0;
    const remaining = Math.max(0, this.config.maxQuizzesPerHour - used);
    const exceeded = used >= this.config.maxQuizzesPerHour;
    const resetAt = this.calculateResetTime();

    const status: QuotaStatus = {
      userId,
      used,
      remaining,
      resetAt,
      exceeded,
    };

    // Log quota check result
    if (exceeded) {
      Logger.info(LogCategory.AI, 'quota_exceeded', {
        userId,
        used,
        maxQuizzesPerHour: this.config.maxQuizzesPerHour,
      });
    } else {
      Logger.info(LogCategory.AI, 'quota_check_pass', {
        userId,
        used,
        remaining,
      });
    }

    return status;
  }

  /**
   * Increment the quota counter for a user
   * 
   * Should ONLY be called when AI batch generation is actually executed.
   * Do NOT call on cache hits, database fallback, or failed AI attempts.
   * 
   * @param userId - The user ID to increment quota for
   * 
   * Requirements: 6.1
   */
  async incrementQuota(userId: number): Promise<void> {
    const key = this.generateKey(userId);
    const newCount = await this.store.increment(key, this.config.windowMs);

    Logger.info(LogCategory.AI, 'ai_call_executed', {
      userId,
      newQuotaCount: newCount,
      maxQuizzesPerHour: this.config.maxQuizzesPerHour,
    });
  }

  /**
   * Get the current quota status for a user
   * 
   * Same as checkQuota but without logging (for status queries).
   * 
   * @param userId - The user ID to get status for
   * @returns QuotaStatus with current usage information
   * 
   * Requirements: 1.4
   */
  async getQuotaStatus(userId: number): Promise<QuotaStatus> {
    const key = this.generateKey(userId);
    const entry = await this.store.get(key);
    
    const used = entry?.count || 0;
    const remaining = Math.max(0, this.config.maxQuizzesPerHour - used);
    const exceeded = used >= this.config.maxQuizzesPerHour;
    const resetAt = this.calculateResetTime();

    return {
      userId,
      used,
      remaining,
      resetAt,
      exceeded,
    };
  }

  /**
   * Validate and cap the question count for a quiz request
   * 
   * Ensures the requested question count does not exceed the maximum.
   * 
   * @param requestedCount - The number of questions requested
   * @returns The validated question count (capped at maxQuestionsPerQuiz)
   * 
   * Requirements: 1.2
   */
  validateQuestionCount(requestedCount: number): number {
    if (requestedCount <= 0) {
      return 1; // Minimum 1 question
    }
    return Math.min(requestedCount, this.config.maxQuestionsPerQuiz);
  }

  /**
   * Get the maximum questions allowed per quiz
   * 
   * @returns The configured maximum questions per quiz
   * 
   * Requirements: 1.2
   */
  getMaxQuestionsPerQuiz(): number {
    return this.config.maxQuestionsPerQuiz;
  }

  /**
   * Get the maximum quizzes allowed per hour
   * 
   * @returns The configured maximum quizzes per hour
   * 
   * Requirements: 1.1
   */
  getMaxQuizzesPerHour(): number {
    return this.config.maxQuizzesPerHour;
  }

  /**
   * Update quota configuration in real-time (Admin control)
   * 
   * Requirements: 1.1, 1.2
   */
  updateConfig(newConfig: Partial<QuotaConfig>): void {
    this.config = { ...this.config, ...newConfig };
    Logger.info(LogCategory.AI, 'quota_config_updated', this.config);
  }
}

// Export singleton instance with default configuration
export const aiQuotaService = new AIQuotaService();
