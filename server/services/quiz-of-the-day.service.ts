import { db } from '../db';
import { questions, quizAttempts, userQuizStats, userPoints, quizOfTheDayCompletions, users } from '../../shared/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { Logger, LogCategory } from '../utils/logger';

/**
 * QuizOfTheDayService - Manage Quiz of the Day feature
 * 
 * This service provides Quiz of the Day functionality including:
 * - Daily quiz selection based on trending topics
 * - Fallback to popular quizzes when no trending data
 * - Daily rotation logic
 * - Bonus rewards for completion
 * 
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 */

export interface QuizOfTheDay {
  id: string;
  date: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  title: string;
  description: string;
  isTrending: boolean;
  bonusPoints: number;
}

export interface QuizOfTheDayCompletion {
  userId: number;
  quizId: string;
  completedAt: Date;
  bonusAwarded: boolean;
}

export class QuizOfTheDayService {
  private static readonly BONUS_POINTS = 50;
  private static readonly TRENDING_DAYS_THRESHOLD = 7; // Look at last 7 days for trending
  private static readonly MIN_ATTEMPTS_FOR_TRENDING = 10; // Minimum attempts to be considered trending
  private static readonly QUESTION_COUNT = 10; // Number of questions in Quiz of the Day

  /**
   * Get the Quiz of the Day for a specific date
   * Requirements: 22.1, 22.2, 22.3, 22.5
   * 
   * @param date - Date to get quiz for (defaults to today)
   * @returns Quiz of the Day configuration
   */
  async getQuizOfTheDay(date: Date = new Date()): Promise<QuizOfTheDay> {
    try {
      const dateString = this.getDateString(date);
      
      Logger.info(LogCategory.BUSINESS, 'Getting Quiz of the Day', { date: dateString });

      // Try to get trending category
      const trendingCategory = await this.getTrendingCategory();

      if (trendingCategory) {
        Logger.info(LogCategory.BUSINESS, 'Found trending category', { category: trendingCategory });
        
        return {
          id: `qotd-${dateString}`,
          date: dateString,
          category: trendingCategory,
          difficulty: this.getDifficultyForDate(date),
          questionCount: QuizOfTheDayService.QUESTION_COUNT,
          title: `${trendingCategory} Challenge`,
          description: `Today's trending topic: ${trendingCategory}. Complete this quiz to earn bonus points!`,
          isTrending: true,
          bonusPoints: QuizOfTheDayService.BONUS_POINTS,
        };
      }

      // Fallback to popular quiz
      Logger.info(LogCategory.BUSINESS, 'No trending data, falling back to popular quiz');
      const popularCategory = await this.getPopularCategory();

      return {
        id: `qotd-${dateString}`,
        date: dateString,
        category: popularCategory,
        difficulty: this.getDifficultyForDate(date),
        questionCount: QuizOfTheDayService.QUESTION_COUNT,
        title: `${popularCategory} Daily Challenge`,
        description: `Today's popular topic: ${popularCategory}. Complete this quiz to earn bonus points!`,
        isTrending: false,
        bonusPoints: QuizOfTheDayService.BONUS_POINTS,
      };
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error getting Quiz of the Day', error as Error);
      throw new Error('Failed to get Quiz of the Day');
    }
  }

  /**
   * Check if user has completed Quiz of the Day
   * 
   * @param userId - User ID
   * @param date - Date to check (defaults to today)
   * @returns True if completed, false otherwise
   */
  async hasCompletedToday(userId: number, date: Date = new Date()): Promise<boolean> {
    try {
      const dateString = this.getDateString(date);

      // Check quiz_of_the_day_completions table for today's completion
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const completions = await db
        .select()
        .from(quizOfTheDayCompletions)
        .where(
          and(
            eq(quizOfTheDayCompletions.userId, userId),
            gte(quizOfTheDayCompletions.date, startOfDay),
            sql`${quizOfTheDayCompletions.date} <= ${endOfDay}`
          )
        )
        .limit(1);

      return completions.length > 0;
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error checking Quiz of the Day completion', error as Error);
      return false;
    }
  }

  /**
   * Award bonus points for completing Quiz of the Day
   * Requirements: 22.4
   * 
   * @param userId - User ID
   * @param quizId - Quiz of the Day ID
   * @param completionData - Quiz completion data
   * @returns Bonus points awarded
   */
  async awardBonusPoints(
    userId: number, 
    quizId: string,
    completionData: {
      category: string;
      difficulty: string;
      score: number;
      totalQuestions: number;
      correctAnswers: number;
      timeSpent: number;
      accuracy: number;
    }
  ): Promise<number> {
    try {
      Logger.info(LogCategory.BUSINESS, 'Awarding Quiz of the Day bonus', { userId, quizId });

      // Check if already awarded today
      const hasCompleted = await this.hasCompletedToday(userId);
      if (hasCompleted) {
        Logger.info(LogCategory.BUSINESS, 'User already completed Quiz of the Day today', { userId });
        return 0;
      }

      // Start a transaction to ensure data consistency
      const bonusPoints = QuizOfTheDayService.BONUS_POINTS;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Insert into quiz_of_the_day_completions table
      await db.insert(quizOfTheDayCompletions).values({
        userId,
        quizId,
        date: today,
        category: completionData.category,
        difficulty: completionData.difficulty,
        score: completionData.score,
        totalQuestions: completionData.totalQuestions,
        correctAnswers: completionData.correctAnswers,
        timeSpent: completionData.timeSpent,
        accuracy: completionData.accuracy,
        bonusAwarded: bonusPoints,
      });

      // Insert into user_points table
      await db.insert(userPoints).values({
        userId,
        points: bonusPoints,
        source: 'qotd',
        amount: bonusPoints,
        description: `Quiz of the Day completion bonus - ${quizId}`,
        metadata: {
          quizId,
          category: completionData.category,
          difficulty: completionData.difficulty,
          score: completionData.score,
        },
      });

      // Update user's total points
      await db
        .update(users)
        .set({
          totalPoints: sql`${users.totalPoints} + ${bonusPoints}`,
        })
        .where(eq(users.id, userId));

      Logger.info(LogCategory.BUSINESS, 'Bonus points awarded successfully', {
        userId,
        amount: bonusPoints,
        quizId,
      });
      
      return bonusPoints;
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error awarding bonus points', error as Error);
      return 0;
    }
  }

  /**
   * Get trending category based on recent quiz attempts
   * Requirements: 22.2
   * 
   * @returns Trending category name or null if no trending data
   */
  private async getTrendingCategory(): Promise<string | null> {
    try {
      // Calculate date threshold (last N days)
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - QuizOfTheDayService.TRENDING_DAYS_THRESHOLD);

      // Get category with most attempts in the last N days
      const trendingCategories = await db
        .select({
          category: quizAttempts.category,
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(quizAttempts)
        .where(
          and(
            gte(quizAttempts.createdAt, thresholdDate),
            sql`${quizAttempts.category} IS NOT NULL`
          )
        )
        .groupBy(quizAttempts.category)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(1);

      if (trendingCategories.length === 0) {
        return null;
      }

      const trending = trendingCategories[0];
      
      // Check if it meets the minimum threshold
      if (trending.count < QuizOfTheDayService.MIN_ATTEMPTS_FOR_TRENDING) {
        return null;
      }

      return trending.category;
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error getting trending category', error as Error);
      return null;
    }
  }

  /**
   * Get popular category as fallback
   * Requirements: 22.5
   * 
   * @returns Popular category name
   */
  private async getPopularCategory(): Promise<string> {
    try {
      // Get category with most questions available
      const popularCategories = await db
        .select({
          category: questions.category,
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(questions)
        .where(eq(questions.isPublic, true))
        .groupBy(questions.category)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(1);

      if (popularCategories.length > 0) {
        return popularCategories[0].category;
      }

      // Ultimate fallback to a default category
      return 'General Knowledge';
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error getting popular category', error as Error);
      return 'General Knowledge';
    }
  }

  /**
   * Get difficulty level based on date (rotates daily)
   * Requirements: 22.3
   * 
   * @param date - Date to calculate difficulty for
   * @returns Difficulty level
   */
  private getDifficultyForDate(date: Date): 'easy' | 'medium' | 'hard' {
    // Rotate difficulty based on day of week
    // Monday, Thursday, Sunday: Easy
    // Tuesday, Friday: Medium
    // Wednesday, Saturday: Hard
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 1 || dayOfWeek === 4 || dayOfWeek === 0) {
      return 'easy';
    } else if (dayOfWeek === 2 || dayOfWeek === 5) {
      return 'medium';
    } else {
      return 'hard';
    }
  }

  /**
   * Get date string in YYYY-MM-DD format (local timezone)
   * 
   * @param date - Date to format
   * @returns Date string in local timezone
   */
  private getDateString(date: Date): string {
    // Use local timezone instead of UTC to avoid date shift issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get user's Quiz of the Day statistics
   * 
   * @param userId - User ID
   * @returns Statistics object
   */
  async getUserQOTDStats(userId: number): Promise<{
    totalCompleted: number;
    currentStreak: number;
    longestStreak: number;
    totalBonusPoints: number;
  }> {
    try {
      // Get completions from quiz_of_the_day_completions table
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const completions = await db
        .select({
          date: sql<string>`DATE(${quizOfTheDayCompletions.date})`.as('date'),
          bonusAwarded: sql<number>`SUM(${quizOfTheDayCompletions.bonusAwarded})`.as('bonusAwarded'),
        })
        .from(quizOfTheDayCompletions)
        .where(
          and(
            eq(quizOfTheDayCompletions.userId, userId),
            gte(quizOfTheDayCompletions.date, thirtyDaysAgo)
          )
        )
        .groupBy(sql`DATE(${quizOfTheDayCompletions.date})`)
        .orderBy(desc(sql`DATE(${quizOfTheDayCompletions.date})`));

      const totalCompleted = completions.length;
      
      // Calculate total bonus points from actual completions
      const totalBonusPoints = completions.reduce((sum: number, c: any) => sum + (c.bonusAwarded || 0), 0);
      
      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < completions.length; i++) {
        const completionDate = new Date(completions[i].date);
        completionDate.setHours(0, 0, 0, 0);
        
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        
        if (completionDate.getTime() === expectedDate.getTime()) {
          tempStreak++;
          if (i === 0 || currentStreak > 0) {
            currentStreak = tempStreak;
          }
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 0;
        }
      }
      
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }

      return {
        totalCompleted,
        currentStreak,
        longestStreak,
        totalBonusPoints,
      };
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error getting user QOTD stats', error as Error);
      return {
        totalCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalBonusPoints: 0,
      };
    }
  }
}

// Export singleton instance
export const quizOfTheDayService = new QuizOfTheDayService();
