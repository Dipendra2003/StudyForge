import { db } from '../db';
import { quizAttempts, users, userQuizStats } from '../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
/**
 * LeaderboardService - Manage leaderboard rankings and updates
 * 
 * This service provides leaderboard functionality including global rankings,
 * category-specific rankings, score updates, and user position tracking.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  score: number;
  timeSpent: number;
  accuracy?: number;
  badge?: string;
  isCurrentUser: boolean;
}
export interface LeaderboardFilters {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  limit?: number;
  offset?: number;
}
export class LeaderboardService {
  /**
   * Get global leaderboard rankings
   * Requirement: 7.1 - Display global rankings with username, score, and time
   * 
   * @param limit - Maximum number of entries to return (default: 10)
   * @param currentUserId - Current user ID for highlighting
   * @returns Array of leaderboard entries
   */
  async getGlobalLeaderboard(limit: number = 10, currentUserId?: number): Promise<LeaderboardEntry[]> {
    try {
      // Query top performers based on average score from userQuizStats
      const topPerformers = await db
        .select({
          userId: userQuizStats.userId,
          username: users.username,
          averageScore: userQuizStats.averageScore,
          totalTimeSpent: userQuizStats.totalTimeSpent,
          totalAttempts: userQuizStats.totalAttempts,
          averageAccuracy: userQuizStats.averageAccuracy,
        })
        .from(userQuizStats)
        .innerJoin(users, eq(userQuizStats.userId, users.id))
        .where(sql`${userQuizStats.totalAttempts} > 0`)
        .orderBy(desc(userQuizStats.averageScore), desc(userQuizStats.totalAttempts))
        .limit(limit);
      // Map to LeaderboardEntry format with ranks
      const leaderboard: LeaderboardEntry[] = topPerformers.map((entry: any, index: number) => ({
        rank: index + 1,
        userId: entry.userId,
        username: entry.username,
        score: Math.round((entry.averageScore || 0) / 100), // Convert from stored precision
        timeSpent: entry.totalTimeSpent || 0,
        accuracy: Math.round((entry.averageAccuracy || 0) / 100), // Convert from stored precision
        badge: this.determineBadge(Math.round((entry.averageScore || 0) / 100)),
        isCurrentUser: currentUserId ? entry.userId === currentUserId : false,
      }));
      return leaderboard;
    } catch (error) {

      throw new Error('Failed to retrieve global leaderboard');
    }
  }
  /**
   * Get category-specific leaderboard rankings
   * Requirement: 7.2 - Display local rankings filtered by category or difficulty
   * 
   * @param category - Category to filter by
   * @param limit - Maximum number of entries to return (default: 10)
   * @param currentUserId - Current user ID for highlighting
   * @returns Array of leaderboard entries for the category
   */
  async getCategoryLeaderboard(
    category: string,
    limit: number = 10,
    currentUserId?: number
  ): Promise<LeaderboardEntry[]> {
    try {
      // Get all users with stats in this category
      const categoryPerformers = await db
        .select({
          userId: userQuizStats.userId,
          username: users.username,
          categoryStats: userQuizStats.categoryStats,
          totalTimeSpent: userQuizStats.totalTimeSpent,
        })
        .from(userQuizStats)
        .innerJoin(users, eq(userQuizStats.userId, users.id))
        .where(sql`${userQuizStats.categoryStats}->${category} IS NOT NULL`);
      // Extract category-specific stats and sort
      const rankedPerformers = categoryPerformers
        .map((entry: any) => {
          const categoryStatsData = entry.categoryStats as Record<string, any>;
          const catStats = categoryStatsData?.[category];
          if (!catStats) return null;
          return {
            userId: entry.userId,
            username: entry.username,
            averageScore: (catStats.averageScore || 0) / 100,
            accuracy: (catStats.accuracy || 0) / 100,
            attempts: catStats.attempts || 0,
            timeSpent: entry.totalTimeSpent || 0,
          };
        })
        .filter((entry: any) => entry !== null)
        .sort((a: any, b: any) => {
          // Sort by average score descending, then by attempts descending
          if (b!.averageScore !== a!.averageScore) {
            return b!.averageScore - a!.averageScore;
          }
          return b!.attempts - a!.attempts;
        })
        .slice(0, limit);
      // Map to LeaderboardEntry format
      const leaderboard: LeaderboardEntry[] = rankedPerformers.map((entry: any, index: number) => ({
        rank: index + 1,
        userId: entry!.userId,
        username: entry!.username,
        score: Math.round(entry!.averageScore),
        timeSpent: entry!.timeSpent,
        accuracy: Math.round(entry!.accuracy),
        badge: this.determineBadge(Math.round(entry!.averageScore)),
        isCurrentUser: currentUserId ? entry!.userId === currentUserId : false,
      }));
      return leaderboard;
    } catch (error) {

      throw new Error('Failed to retrieve category leaderboard');
    }
  }
  /**
   * Get difficulty-specific leaderboard rankings
   * Requirement: 7.2 - Display local rankings filtered by difficulty
   * 
   * @param difficulty - Difficulty level to filter by
   * @param limit - Maximum number of entries to return (default: 10)
   * @param currentUserId - Current user ID for highlighting
   * @returns Array of leaderboard entries for the difficulty
   */
  async getDifficultyLeaderboard(
    difficulty: 'easy' | 'medium' | 'hard',
    limit: number = 10,
    currentUserId?: number
  ): Promise<LeaderboardEntry[]> {
    try {
      // Get all users with stats in this difficulty
      const difficultyPerformers = await db
        .select({
          userId: userQuizStats.userId,
          username: users.username,
          difficultyStats: userQuizStats.difficultyStats,
          totalTimeSpent: userQuizStats.totalTimeSpent,
        })
        .from(userQuizStats)
        .innerJoin(users, eq(userQuizStats.userId, users.id))
        .where(sql`${userQuizStats.difficultyStats}->${difficulty} IS NOT NULL`);
      // Extract difficulty-specific stats and sort
      const rankedPerformers = difficultyPerformers
        .map((entry: any) => {
          const difficultyStatsData = entry.difficultyStats as Record<string, any>;
          const diffStats = difficultyStatsData?.[difficulty];
          if (!diffStats) return null;
          return {
            userId: entry.userId,
            username: entry.username,
            averageScore: (diffStats.averageScore || 0) / 100,
            accuracy: (diffStats.accuracy || 0) / 100,
            attempts: diffStats.attempts || 0,
            timeSpent: entry.totalTimeSpent || 0,
          };
        })
        .filter((entry: any) => entry !== null)
        .sort((a: any, b: any) => {
          // Sort by average score descending, then by attempts descending
          if (b!.averageScore !== a!.averageScore) {
            return b!.averageScore - a!.averageScore;
          }
          return b!.attempts - a!.attempts;
        })
        .slice(0, limit);
      // Map to LeaderboardEntry format
      const leaderboard: LeaderboardEntry[] = rankedPerformers.map((entry: any, index: number) => ({
        rank: index + 1,
        userId: entry!.userId,
        username: entry!.username,
        score: Math.round(entry!.averageScore),
        timeSpent: entry!.timeSpent,
        accuracy: Math.round(entry!.accuracy),
        badge: this.determineBadge(Math.round(entry!.averageScore)),
        isCurrentUser: currentUserId ? entry!.userId === currentUserId : false,
      }));
      return leaderboard;
    } catch (error) {

      throw new Error('Failed to retrieve difficulty leaderboard');
    }
  }
  /**
   * Update leaderboard after a quiz completion
   * Requirement: 7.3 - Update leaderboard with new score if it qualifies
   * 
   * Note: This method updates the userQuizStats which is used by leaderboard queries.
   * The actual leaderboard is computed dynamically from userQuizStats.
   * 
   * @param userId - User ID
   * @param score - Quiz score (0-100)
   * @param category - Quiz category
   * @param difficulty - Quiz difficulty
   */
  async updateLeaderboard(
    userId: number,
    score: number,
    category: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<void> {
    try {
      // The leaderboard is automatically updated through userQuizStats
      // This method serves as a hook for any additional leaderboard-specific logic
      // Verify the user's stats exist
      const stats = await db
        .select()
        .from(userQuizStats)
        .where(eq(userQuizStats.userId, userId))
        .limit(1);
      if (stats.length === 0) {

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
      }
      // Log the leaderboard update
    } catch (error) {

      throw new Error('Failed to update leaderboard');
    }
  }
  /**
   * Get user's rank in global leaderboard
   * Requirement: 7.4 - Highlight current user's position
   * 
   * @param userId - User ID
   * @returns User's rank (1-based), or null if not ranked
   */
  async getUserRank(userId: number): Promise<number | null> {
    try {
      // Get all users ordered by average score
      const allUsers = await db
        .select({
          userId: userQuizStats.userId,
          averageScore: userQuizStats.averageScore,
          totalAttempts: userQuizStats.totalAttempts,
        })
        .from(userQuizStats)
        .where(sql`${userQuizStats.totalAttempts} > 0`)
        .orderBy(desc(userQuizStats.averageScore), desc(userQuizStats.totalAttempts));
      // Find user's position
      const userIndex = allUsers.findIndex((entry: any) => entry.userId === userId);
      if (userIndex === -1) {
        return null; // User not found or has no attempts
      }
      return userIndex + 1; // Convert to 1-based rank
    } catch (error) {

      throw new Error('Failed to retrieve user rank');
    }
  }
  /**
   * Get user's rank in category leaderboard
   * 
   * @param userId - User ID
   * @param category - Category name
   * @returns User's rank in category (1-based), or null if not ranked
   */
  async getUserCategoryRank(userId: number, category: string): Promise<number | null> {
    try {
      // Get all users with stats in this category
      const categoryPerformers = await db
        .select({
          userId: userQuizStats.userId,
          categoryStats: userQuizStats.categoryStats,
        })
        .from(userQuizStats)
        .where(sql`${userQuizStats.categoryStats}->${category} IS NOT NULL`);
      // Extract and sort by category score
      const rankedUsers = categoryPerformers
        .map((entry: any) => {
          const categoryStatsData = entry.categoryStats as Record<string, any>;
          const catStats = categoryStatsData?.[category];
          if (!catStats) return null;
          return {
            userId: entry.userId,
            averageScore: catStats.averageScore || 0,
            attempts: catStats.attempts || 0,
          };
        })
        .filter((entry: any) => entry !== null)
        .sort((a: any, b: any) => {
          if (b!.averageScore !== a!.averageScore) {
            return b!.averageScore - a!.averageScore;
          }
          return b!.attempts - a!.attempts;
        });
      // Find user's position
      const userIndex = rankedUsers.findIndex((entry: any) => entry!.userId === userId);
      if (userIndex === -1) {
        return null;
      }
      return userIndex + 1;
    } catch (error) {

      throw new Error('Failed to retrieve user category rank');
    }
  }
  /**
   * Helper method to determine badge based on score
   * 
   * @param score - Score (0-100)
   * @returns Badge name or undefined
   */
  private determineBadge(score: number): string | undefined {
    if (score > 90) return 'gold';
    if (score >= 70) return 'silver';
    if (score >= 50) return 'bronze';
    return undefined;
  }
}
