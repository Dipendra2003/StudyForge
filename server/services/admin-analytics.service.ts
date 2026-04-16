/**
 * Admin Analytics Service
 * Provides analytics metrics for admin dashboard with caching
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10
 */

import { db } from '../db/index';
import { 
  users, 
  quizAttempts, 
  chatHistory, 
  questions, 
  flashcards, 
  documents 
} from '../../shared/schema';
import { count, sql, gte, desc } from 'drizzle-orm';
import { analyticsCacheService } from './analytics-cache.service';
import { Logger, LogCategory } from '../utils/logger';

/**
 * Growth data interface
 */
interface GrowthData {
  date: string;
  count: number;
  label: string;
}

/**
 * AI usage statistics interface
 */
interface AIUsageStats {
  totalRequests: number;
  tokensConsumed: number;
  quotaRemaining: number;
  averageResponseTime: number;
}

/**
 * Category statistics interface
 */
interface CategoryStats {
  category: string;
  usageCount: number;
  averageScore: number;
}

/**
 * Content statistics interface
 */
interface ContentStats {
  quizzes: number;
  flashcards: number;
  documents: number;
  questions: number;
  totalContent: number;
}

class AdminAnalyticsService {
  /**
   * Get total user count
   * Requirements: 6.1, 6.9
   */
  async getTotalUsers(): Promise<number> {
    try {
      const cacheKey = 'analytics:users:total';
      
      // Check cache first
      const cached = analyticsCacheService.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Query database
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(users);

      // Cache result
      analyticsCacheService.set(cacheKey, total);

      Logger.debug(LogCategory.ANALYTICS, 'Total users retrieved', { total });
      return total;
    } catch (error) {
      Logger.error(LogCategory.ANALYTICS, 'Failed to get total users', error as Error);
      throw new Error('Failed to retrieve total users');
    }
  }

  /**
   * Get active users count (users who logged in within last N days)
   * Requirements: 6.2, 6.9
   */
  async getActiveUsers(days: number = 30): Promise<number> {
    try {
      const cacheKey = `analytics:users:active:${days}d`;
      
      // Check cache first
      const cached = analyticsCacheService.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Calculate date threshold
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - days);

      // Query database
      const [{ value: activeCount }] = await db
        .select({ value: count() })
        .from(users)
        .where(gte(users.lastLogin, thresholdDate));

      // Cache result
      analyticsCacheService.set(cacheKey, activeCount);

      Logger.debug(LogCategory.ANALYTICS, 'Active users retrieved', { 
        days, 
        activeCount 
      });
      return activeCount;
    } catch (error) {
      Logger.error(LogCategory.ANALYTICS, 'Failed to get active users', error as Error);
      throw new Error('Failed to retrieve active users');
    }
  }

  /**
   * Get user growth metrics by period
   * Requirements: 6.7, 6.9
   */
  async getUserGrowth(period: 'day' | 'week' | 'month'): Promise<GrowthData[]> {
    try {
      const cacheKey = `analytics:users:growth:${period}`;
      
      // Check cache first
      const cached = analyticsCacheService.get<GrowthData[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      let dateFormat: string;
      let limit: number;

      switch (period) {
        case 'day':
          dateFormat = '%Y-%m-%d';
          limit = 30; // Last 30 days
          break;
        case 'week':
          dateFormat = '%Y-%u'; // Year-Week
          limit = 12; // Last 12 weeks
          break;
        case 'month':
          dateFormat = '%Y-%m';
          limit = 12; // Last 12 months
          break;
      }

      // Query database with date grouping
      const growthData = await db
        .select({
          date: sql<string>`DATE_FORMAT(${users.createdAt}, ${dateFormat})`,
          count: count(),
        })
        .from(users)
        .groupBy(sql`DATE_FORMAT(${users.createdAt}, ${dateFormat})`)
        .orderBy(sql`DATE_FORMAT(${users.createdAt}, ${dateFormat})`)
        .limit(limit);

      const result: GrowthData[] = growthData.map((row: { date: string; count: number }) => {
        // Convert date format to ISO string for proper parsing
        let isoDate = row.date;
        if (period === 'month') {
          // Convert "2026-04" to "2026-04-01"
          isoDate = `${row.date}-01`;
        } else if (period === 'week') {
          // For week format, keep as is but add context
          isoDate = row.date;
        }
        
        return {
          date: isoDate,
          count: row.count,
          label: row.date,
        };
      });

      // Cache result
      analyticsCacheService.set(cacheKey, result);

      Logger.debug(LogCategory.ANALYTICS, 'User growth retrieved', { 
        period, 
        dataPoints: result.length 
      });
      return result;
    } catch (error) {
      Logger.error(LogCategory.ANALYTICS, 'Failed to get user growth', error as Error);
      throw new Error('Failed to retrieve user growth metrics');
    }
  }

  /**
   * Get total quiz attempts count
   * Requirements: 6.3, 6.9
   */
  async getTotalQuizAttempts(): Promise<number> {
    try {
      const cacheKey = 'analytics:quizzes:total';
      
      // Check cache first
      const cached = analyticsCacheService.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Query database
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(quizAttempts);

      // Cache result
      analyticsCacheService.set(cacheKey, total);

      Logger.debug(LogCategory.ANALYTICS, 'Total quiz attempts retrieved', { total });
      return total;
    } catch (error) {
      Logger.error(LogCategory.ANALYTICS, 'Failed to get total quiz attempts', error as Error);
      throw new Error('Failed to retrieve total quiz attempts');
    }
  }

  /**
   * Get average quiz score across all attempts
   * Requirements: 6.4, 6.9
   */
  async getAverageQuizScore(): Promise<number> {
    try {
      const cacheKey = 'analytics:quizzes:avg_score';
      
      // Check cache first
      const cached = analyticsCacheService.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Query database - calculate average score
      const result = await db
        .select({
          avgScore: sql<number>`AVG(${quizAttempts.score})`,
        })
        .from(quizAttempts);

      const averageScore = result[0]?.avgScore || 0;

      // Cache result
      analyticsCacheService.set(cacheKey, averageScore);

      Logger.debug(LogCategory.ANALYTICS, 'Average quiz score retrieved', { 
        averageScore 
      });
      return averageScore;
    } catch (error) {
      Logger.error(LogCategory.ANALYTICS, 'Failed to get average quiz score', error as Error);
      throw new Error('Failed to retrieve average quiz score');
    }
  }

  /**
   * Get AI usage statistics
   * Requirements: 6.5, 6.9
   */
  async getAIUsageStats(): Promise<AIUsageStats> {
    try {
      const cacheKey = 'analytics:ai:usage';
      
      // Check cache first
      const cached = analyticsCacheService.get<AIUsageStats>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Count total AI requests (chat history messages)
      const [{ value: totalRequests }] = await db
        .select({ value: count() })
        .from(chatHistory);

      // For now, return placeholder values for tokens and quota
      // These would be tracked in a separate AI usage tracking table in production
      const stats: AIUsageStats = {
        totalRequests,
        tokensConsumed: 0, // Would come from AI quota tracking
        quotaRemaining: 0, // Would come from AI quota service
        averageResponseTime: 0, // Would be tracked per request
      };

      // Cache result
      analyticsCacheService.set(cacheKey, stats);

      Logger.debug(LogCategory.ANALYTICS, 'AI usage stats retrieved', stats);
      return stats;
    } catch (error) {
      Logger.error(LogCategory.ANALYTICS, 'Failed to get AI usage stats', error as Error);
      throw new Error('Failed to retrieve AI usage statistics');
    }
  }

  /**
   * Get popular categories ranked by usage
   * Requirements: 6.6, 6.9
   */
  async getPopularCategories(limit: number = 10): Promise<CategoryStats[]> {
    try {
      const cacheKey = `analytics:categories:popular:${limit}`;
      
      // Check cache first
      const cached = analyticsCacheService.get<CategoryStats[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Query database - group by category and count
      const categoryData = await db
        .select({
          category: quizAttempts.category,
          usageCount: count(),
          avgScore: sql<number>`AVG(${quizAttempts.score})`,
        })
        .from(quizAttempts)
        .where(sql`${quizAttempts.category} IS NOT NULL`)
        .groupBy(quizAttempts.category)
        .orderBy(desc(count()))
        .limit(limit);

      const result: CategoryStats[] = categoryData.map((row: { category: string | null; usageCount: number; avgScore: number }) => ({
        category: row.category || 'Unknown',
        usageCount: row.usageCount,
        averageScore: row.avgScore || 0,
      }));

      // Cache result
      analyticsCacheService.set(cacheKey, result);

      Logger.debug(LogCategory.ANALYTICS, 'Popular categories retrieved', { 
        count: result.length 
      });
      return result;
    } catch (error) {
      Logger.error(LogCategory.ANALYTICS, 'Failed to get popular categories', error as Error);
      throw new Error('Failed to retrieve popular categories');
    }
  }

  /**
   * Get content creation statistics
   * Requirements: 6.8, 6.9
   */
  async getContentCreationStats(): Promise<ContentStats> {
    try {
      const cacheKey = 'analytics:content:stats';
      
      // Check cache first
      const cached = analyticsCacheService.get<ContentStats>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Query counts for each content type
      const [questionsCount] = await db
        .select({ value: count() })
        .from(questions);

      const [flashcardsCount] = await db
        .select({ value: count() })
        .from(flashcards);

      const [documentsCount] = await db
        .select({ value: count() })
        .from(documents);

      // Quiz attempts represent quizzes taken, not created
      // Using questions as proxy for quiz content
      const stats: ContentStats = {
        quizzes: questionsCount.value,
        flashcards: flashcardsCount.value,
        documents: documentsCount.value,
        questions: questionsCount.value,
        totalContent: questionsCount.value + flashcardsCount.value + documentsCount.value,
      };

      // Cache result
      analyticsCacheService.set(cacheKey, stats);

      Logger.debug(LogCategory.ANALYTICS, 'Content stats retrieved', stats);
      return stats;
    } catch (error) {
      Logger.error(LogCategory.ANALYTICS, 'Failed to get content stats', error as Error);
      throw new Error('Failed to retrieve content creation statistics');
    }
  }
}

// Export singleton instance
export const adminAnalyticsService = new AdminAnalyticsService();
