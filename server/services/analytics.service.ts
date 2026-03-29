import { db } from '../db';
import { quizAttempts, userQuizStats } from '../../shared/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

/**
 * AnalyticsService - Performance tracking and statistics
 * 
 * This service provides comprehensive analytics for user quiz performance,
 * including stats retrieval, attempt tracking, trend analysis, and streak management.
 */

// Type definitions based on design document
export interface PerformanceData {
  totalAttempts: number;
  averageScore: number;
  improvementTrend: TrendData[];
  categoryPerformance: CategoryStats[];
  difficultyPerformance: DifficultyStats[];
  streakData: StreakInfo;
}

export interface TrendData {
  date: string;
  averageScore: number;
  attemptsCount: number;
}

export interface CategoryStats {
  category: string;
  attempts: number;
  averageScore: number;
  accuracy: number;
  masteryLevel: number;
}

export interface DifficultyStats {
  difficulty: string;
  attempts: number;
  averageScore: number;
  accuracy: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastQuizDate: Date | null;
}

export interface QuizAttemptDTO {
  userId: number;
  sessionId?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionTypes?: string[];
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  score: number;
  accuracy: number;
  timeSpent: number;
  hintsUsed?: number;
  voiceModeEnabled?: boolean;
  questionsData?: any;
  completed: boolean;
}

export class AnalyticsService {
  /**
   * Get comprehensive user statistics
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
   * 
   * @param userId - User ID
   * @returns Performance data including all analytics
   */
  async getUserStats(userId: number): Promise<PerformanceData> {
    try {
      // Get or create user quiz stats record
      let stats = await db
        .select()
        .from(userQuizStats)
        .where(eq(userQuizStats.userId, userId))
        .limit(1);

      if (stats.length === 0) {
        // Create initial stats record
        await db.insert(userQuizStats).values({
          userId,
          totalAttempts: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          averageScore: 0,
          averageAccuracy: 0,
          totalTimeSpent: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastQuizDate: null,
          categoryStats: {},
          difficultyStats: {},
        });

        // Fetch the newly created record
        stats = await db
          .select()
          .from(userQuizStats)
          .where(eq(userQuizStats.userId, userId))
          .limit(1);
      }

      const userStats = stats[0];

      // Get improvement trend data
      const improvementTrend = await this.calculateImprovementTrend(userId, 'week');

      // Get category performance
      const categoryPerformance = await this.getCategoryPerformance(userId);

      // Get difficulty performance
      const difficultyPerformance = this.getDifficultyPerformance(userStats);

      // Build streak info
      const streakData: StreakInfo = {
        currentStreak: userStats.currentStreak || 0,
        longestStreak: userStats.longestStreak || 0,
        lastQuizDate: userStats.lastQuizDate || null,
      };

      return {
        totalAttempts: userStats.totalAttempts || 0,
        averageScore: (userStats.averageScore || 0) / 100, // Convert back from stored precision
        improvementTrend,
        categoryPerformance,
        difficultyPerformance,
        streakData,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw new Error('Failed to retrieve user statistics');
    }
  }

  /**
   * Record a quiz attempt and update user statistics
   * Requirements: 8.6
   * 
   * @param attempt - Quiz attempt data
   */
  async recordQuizAttempt(attempt: QuizAttemptDTO): Promise<number> {
    try {
      // Insert quiz attempt record
      const result = await db.insert(quizAttempts).values({
        userId: attempt.userId,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        timeSpent: attempt.timeSpent,
        questionsData: attempt.questionsData || null,
        category: attempt.category,
        difficulty: attempt.difficulty,
        completed: attempt.completed,
      });

      // Get the inserted ID
      const insertId = result[0]?.insertId || result.insertId;

      // Update user quiz stats
      await this.updateUserStats(attempt);

      // Update streak
      await this.updateStreak(attempt.userId);

      return insertId;
    } catch (error) {
      console.error('Error recording quiz attempt:', error);
      throw new Error('Failed to record quiz attempt');
    }
  }

  /**
   * Calculate improvement trend over a time period
   * Requirements: 8.3
   * 
   * @param userId - User ID
   * @param period - Time period ('week', 'month', 'year', 'all')
   * @returns Array of trend data points
   */
  async calculateImprovementTrend(userId: number, period: string): Promise<TrendData[]> {
    try {
      // Calculate date threshold based on period
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0); // Beginning of time
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Fetch quiz attempts within the period
      const attempts = await db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.userId, userId),
            gte(quizAttempts.createdAt, startDate)
          )
        )
        .orderBy(desc(quizAttempts.createdAt));

      // Group attempts by date and calculate averages
      const trendMap = new Map<string, { totalScore: number; count: number }>();

      for (const attempt of attempts) {
        const dateKey = attempt.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, { totalScore: 0, count: 0 });
        }

        const data = trendMap.get(dateKey)!;
        data.totalScore += attempt.score;
        data.count += 1;
      }

      // Convert map to array of TrendData
      const trendData: TrendData[] = Array.from(trendMap.entries())
        .map(([date, data]) => ({
          date,
          averageScore: Math.round(data.totalScore / data.count),
          attemptsCount: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending

      return trendData;
    } catch (error) {
      console.error('Error calculating improvement trend:', error);
      throw new Error('Failed to calculate improvement trend');
    }
  }

  /**
   * Get category-specific performance statistics
   * Requirements: 8.4
   * 
   * @param userId - User ID
   * @returns Array of category performance stats
   */
  async getCategoryPerformance(userId: number): Promise<CategoryStats[]> {
    try {
      // Get user stats record
      const stats = await db
        .select()
        .from(userQuizStats)
        .where(eq(userQuizStats.userId, userId))
        .limit(1);

      if (stats.length === 0 || !stats[0].categoryStats) {
        return [];
      }

      const categoryStatsData = stats[0].categoryStats as Record<string, any>;

      // Convert stored category stats to CategoryStats array
      const categoryPerformance: CategoryStats[] = Object.entries(categoryStatsData).map(
        ([category, data]: [string, any]) => ({
          category,
          attempts: data.attempts || 0,
          averageScore: (data.averageScore || 0) / 100, // Convert from stored precision
          accuracy: (data.accuracy || 0) / 100, // Convert from stored precision
          masteryLevel: data.masteryLevel || 0,
        })
      );

      return categoryPerformance;
    } catch (error) {
      console.error('Error getting category performance:', error);
      throw new Error('Failed to retrieve category performance');
    }
  }

  /**
   * Update user streak information
   * Requirements: 8.6
   * 
   * @param userId - User ID
   * @returns Updated streak information
   */
  async updateStreak(userId: number): Promise<StreakInfo> {
    try {
      // Get user stats
      const stats = await db
        .select()
        .from(userQuizStats)
        .where(eq(userQuizStats.userId, userId))
        .limit(1);

      if (stats.length === 0) {
        throw new Error('User stats not found');
      }

      const userStats = stats[0];
      const now = new Date();
      const lastQuizDate = userStats.lastQuizDate;

      let currentStreak = userStats.currentStreak || 0;
      let longestStreak = userStats.longestStreak || 0;

      if (lastQuizDate) {
        const daysSinceLastQuiz = Math.floor(
          (now.getTime() - lastQuizDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastQuiz === 0) {
          // Same day, streak continues
          // Don't increment
        } else if (daysSinceLastQuiz === 1) {
          // Consecutive day, increment streak
          currentStreak += 1;
        } else {
          // Streak broken, reset to 1
          currentStreak = 1;
        }
      } else {
        // First quiz ever
        currentStreak = 1;
      }

      // Update longest streak if current is higher
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      // Update database
      await db
        .update(userQuizStats)
        .set({
          currentStreak,
          longestStreak,
          lastQuizDate: now,
        })
        .where(eq(userQuizStats.userId, userId));

      return {
        currentStreak,
        longestStreak,
        lastQuizDate: now,
      };
    } catch (error) {
      console.error('Error updating streak:', error);
      throw new Error('Failed to update streak');
    }
  }

  /**
   * Helper method to update user statistics after a quiz attempt
   * 
   * @param attempt - Quiz attempt data
   */
  private async updateUserStats(attempt: QuizAttemptDTO): Promise<void> {
    try {
      // Get current stats
      const stats = await db
        .select()
        .from(userQuizStats)
        .where(eq(userQuizStats.userId, attempt.userId))
        .limit(1);

      if (stats.length === 0) {
        throw new Error('User stats not found');
      }

      const userStats = stats[0];

      // Calculate new totals
      const newTotalAttempts = (userStats.totalAttempts || 0) + 1;
      const newTotalQuestions = (userStats.totalQuestions || 0) + attempt.totalQuestions;
      const newCorrectAnswers = (userStats.correctAnswers || 0) + attempt.correctAnswers;
      const newIncorrectAnswers = (userStats.incorrectAnswers || 0) + attempt.incorrectAnswers;
      const newTotalTimeSpent = (userStats.totalTimeSpent || 0) + attempt.timeSpent;

      // Calculate new averages (stored as integers * 100 for precision)
      const newAverageScore = Math.round(
        ((userStats.averageScore || 0) * (userStats.totalAttempts || 0) + attempt.score * 100) /
          newTotalAttempts
      );
      const newAverageAccuracy = Math.round(
        ((userStats.averageAccuracy || 0) * (userStats.totalAttempts || 0) + attempt.accuracy * 100) /
          newTotalAttempts
      );

      // Update category stats
      const categoryStats = (userStats.categoryStats as Record<string, any>) || {};
      if (!categoryStats[attempt.category]) {
        categoryStats[attempt.category] = {
          attempts: 0,
          averageScore: 0,
          accuracy: 0,
          masteryLevel: 0,
        };
      }

      const catStats = categoryStats[attempt.category];
      const catAttempts = catStats.attempts + 1;
      catStats.averageScore = Math.round(
        (catStats.averageScore * catStats.attempts + attempt.score * 100) / catAttempts
      );
      catStats.accuracy = Math.round(
        (catStats.accuracy * catStats.attempts + attempt.accuracy * 100) / catAttempts
      );
      catStats.attempts = catAttempts;
      catStats.masteryLevel = this.calculateMasteryLevel(catStats.averageScore / 100, catAttempts);

      // Update difficulty stats
      const difficultyStats = (userStats.difficultyStats as Record<string, any>) || {};
      if (!difficultyStats[attempt.difficulty]) {
        difficultyStats[attempt.difficulty] = {
          attempts: 0,
          averageScore: 0,
          accuracy: 0,
        };
      }

      const diffStats = difficultyStats[attempt.difficulty];
      const diffAttempts = diffStats.attempts + 1;
      diffStats.averageScore = Math.round(
        (diffStats.averageScore * diffStats.attempts + attempt.score * 100) / diffAttempts
      );
      diffStats.accuracy = Math.round(
        (diffStats.accuracy * diffStats.attempts + attempt.accuracy * 100) / diffAttempts
      );
      diffStats.attempts = diffAttempts;

      // Update database
      await db
        .update(userQuizStats)
        .set({
          totalAttempts: newTotalAttempts,
          totalQuestions: newTotalQuestions,
          correctAnswers: newCorrectAnswers,
          incorrectAnswers: newIncorrectAnswers,
          averageScore: newAverageScore,
          averageAccuracy: newAverageAccuracy,
          totalTimeSpent: newTotalTimeSpent,
          categoryStats,
          difficultyStats,
          updatedAt: new Date(),
        })
        .where(eq(userQuizStats.userId, attempt.userId));
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  /**
   * Helper method to get difficulty performance from user stats
   * 
   * @param userStats - User quiz stats record
   * @returns Array of difficulty performance stats
   */
  private getDifficultyPerformance(userStats: any): DifficultyStats[] {
    const difficultyStatsData = (userStats.difficultyStats as Record<string, any>) || {};

    return Object.entries(difficultyStatsData).map(([difficulty, data]: [string, any]) => ({
      difficulty,
      attempts: data.attempts || 0,
      averageScore: (data.averageScore || 0) / 100, // Convert from stored precision
      accuracy: (data.accuracy || 0) / 100, // Convert from stored precision
    }));
  }

  /**
   * Helper method to calculate mastery level based on performance
   * 
   * @param averageScore - Average score (0-100)
   * @param attempts - Number of attempts
   * @returns Mastery level (0-100)
   */
  private calculateMasteryLevel(averageScore: number, attempts: number): number {
    // Mastery level considers both score and consistency (attempts)
    // More attempts with high scores = higher mastery
    const scoreWeight = 0.7;
    const consistencyWeight = 0.3;
    
    const scoreComponent = averageScore * scoreWeight;
    const consistencyComponent = Math.min(attempts / 10, 1) * 100 * consistencyWeight;
    
    return Math.round(scoreComponent + consistencyComponent);
  }
}