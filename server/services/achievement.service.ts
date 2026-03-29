import { db } from '../db';
import { achievements, userQuizStats, quizAttempts } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * AchievementService - Manage badges and achievements
 * 
 * This service provides achievement and badge functionality including
 * badge awards based on performance, milestone tracking, and achievement retrieval.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 26.4
 */

export interface Achievement {
  id: number;
  userId: number;
  type: AchievementType;
  name: string;
  description: string;
  badge: string;
  level: number;
  earnedAt: Date;
}

export type AchievementType = 
  | 'perfect_score'
  | 'speed_demon'
  | 'category_master'
  | 'streak_warrior'
  | 'quiz_marathon'
  | 'improvement_star'
  | 'gold_badge'
  | 'silver_badge'
  | 'bronze_badge';

export interface QuizResults {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeSpent: number;
  accuracy: number;
  category: string;
  difficulty: string;
}

export class AchievementService {
  /**
   * Check and award badges based on quiz performance
   * Requirements: 9.1, 9.2, 9.3, 9.4
   * 
   * @param userId - User ID
   * @param results - Quiz results
   * @returns Array of newly earned achievements
   */
  async checkAndAwardBadges(userId: number, results: QuizResults): Promise<Achievement[]> {
    try {
      const newAchievements: Achievement[] = [];

      // Award score-based badges (Gold, Silver, Bronze)
      const scoreBadge = await this.awardScoreBadge(userId, results.score);
      if (scoreBadge) {
        newAchievements.push(scoreBadge);
      }

      // Check for perfect score achievement
      if (results.accuracy === 100) {
        const perfectScore = await this.unlockAchievement(userId, 'perfect_score');
        if (perfectScore) {
          newAchievements.push(perfectScore);
        }
      }

      // Check for speed demon achievement (high score in short time)
      if (results.score > 80 && results.timeSpent < results.totalQuestions * 10) {
        const speedDemon = await this.unlockAchievement(userId, 'speed_demon');
        if (speedDemon) {
          newAchievements.push(speedDemon);
        }
      }

      // Check for streak achievements
      const streakAchievement = await this.checkStreakAchievements(userId);
      if (streakAchievement) {
        newAchievements.push(streakAchievement);
      }

      // Check for category mastery
      const categoryMastery = await this.checkCategoryMastery(userId, results.category);
      if (categoryMastery) {
        newAchievements.push(categoryMastery);
      }

      // Check for quiz marathon (total attempts milestone)
      const marathonAchievement = await this.checkQuizMarathon(userId);
      if (marathonAchievement) {
        newAchievements.push(marathonAchievement);
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking and awarding badges:', error);
      throw new Error('Failed to check and award badges');
    }
  }

  /**
   * Award badge based on score range
   * Requirements: 9.1, 9.2, 9.3
   * 
   * @param userId - User ID
   * @param score - Quiz score (0-100)
   * @returns Achievement if badge was awarded, null otherwise
   */
  private async awardScoreBadge(userId: number, score: number): Promise<Achievement | null> {
    try {
      let badgeType: AchievementType | null = null;
      let badgeName = '';
      let description = '';

      // Determine badge based on score range
      if (score >= 90) {
        badgeType = 'gold_badge';
        badgeName = 'Gold Badge';
        description = 'Achieved a score of 90% or above';
      } else if (score >= 70 && score < 90) {
        badgeType = 'silver_badge';
        badgeName = 'Silver Badge';
        description = 'Achieved a score between 70% and 89%';
      } else if (score >= 50 && score < 70) {
        badgeType = 'bronze_badge';
        badgeName = 'Bronze Badge';
        description = 'Achieved a score between 50% and 69%';
      }

      if (!badgeType) {
        return null; // No badge for scores below 50%
      }

      // Check if user already has this EXACT badge type
      // Award each badge type only ONCE in lifetime (not per quiz)
      const existingBadges = await db
        .select()
        .from(achievements)
        .where(
          and(
            eq(achievements.userId, userId),
            eq(achievements.badge, badgeType)
          )
        )
        .limit(1);

      if (existingBadges.length > 0) {
        // User already has this badge type, don't award again
        return null;
      }

      // Award the badge (first time only)
      const [newAchievement] = await db.insert(achievements).values({
        userId,
        badge: badgeType,
        description,
        level: 1,
      });

      // Fetch the created achievement
      const created = await db
        .select()
        .from(achievements)
        .where(eq(achievements.id, newAchievement.insertId))
        .limit(1);

      if (created.length === 0) {
        return null;
      }

      return {
        id: created[0].id,
        userId: created[0].userId,
        type: badgeType,
        name: badgeName,
        description: created[0].description || description,
        badge: created[0].badge,
        level: created[0].level || 1,
        earnedAt: created[0].earnedAt,
      };
    } catch (error) {
      console.error('Error awarding score badge:', error);
      return null;
    }
  }

  /**
   * Get all achievements for a user
   * Requirements: 9.5
   * 
   * @param userId - User ID
   * @returns Array of user's achievements
   */
  async getUserAchievements(userId: number): Promise<Achievement[]> {
    try {
      const userAchievements = await db
        .select()
        .from(achievements)
        .where(eq(achievements.userId, userId))
        .orderBy(desc(achievements.earnedAt));

      return userAchievements.map((ach: any) => ({
        id: ach.id,
        userId: ach.userId,
        type: ach.badge as AchievementType,
        name: this.getAchievementName(ach.badge),
        description: ach.description || '',
        badge: ach.badge,
        level: ach.level || 1,
        earnedAt: ach.earnedAt instanceof Date ? ach.earnedAt.toISOString() : ach.earnedAt,
      }));
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw new Error('Failed to retrieve user achievements');
    }
  }

  /**
   * Unlock a specific achievement for a user
   * Requirements: 26.4
   * 
   * @param userId - User ID
   * @param achievementType - Type of achievement to unlock
   * @returns Achievement if unlocked, null if already exists
   */
  async unlockAchievement(userId: number, achievementType: AchievementType): Promise<Achievement | null> {
    try {
      // Check if user already has this achievement
      const existing = await db
        .select()
        .from(achievements)
        .where(
          and(
            eq(achievements.userId, userId),
            eq(achievements.badge, achievementType)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Achievement already unlocked
        return null;
      }

      // Get achievement details
      const achievementDetails = this.getAchievementDetails(achievementType);

      // Create the achievement
      const [newAchievement] = await db.insert(achievements).values({
        userId,
        badge: achievementType,
        description: achievementDetails.description,
        level: achievementDetails.level,
      });

      // Fetch the created achievement
      const created = await db
        .select()
        .from(achievements)
        .where(eq(achievements.id, newAchievement.insertId))
        .limit(1);

      if (created.length === 0) {
        return null;
      }

      return {
        id: created[0].id,
        userId: created[0].userId,
        type: achievementType,
        name: achievementDetails.name,
        description: created[0].description || achievementDetails.description,
        badge: created[0].badge,
        level: created[0].level || 1,
        earnedAt: created[0].earnedAt,
      };
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return null;
    }
  }

  /**
   * Check and award streak-based achievements
   * Requirements: 26.4
   * 
   * @param userId - User ID
   * @returns Achievement if earned, null otherwise
   */
  private async checkStreakAchievements(userId: number): Promise<Achievement | null> {
    try {
      // Get user's current streak
      const stats = await db
        .select()
        .from(userQuizStats)
        .where(eq(userQuizStats.userId, userId))
        .limit(1);

      if (stats.length === 0) {
        return null;
      }

      const currentStreak = stats[0].currentStreak || 0;

      // Award streak warrior for 7+ day streak
      if (currentStreak >= 7) {
        return await this.unlockAchievement(userId, 'streak_warrior');
      }

      return null;
    } catch (error) {
      console.error('Error checking streak achievements:', error);
      return null;
    }
  }

  /**
   * Check and award category mastery achievements
   * Requirements: 26.4
   * 
   * @param userId - User ID
   * @param category - Category name
   * @returns Achievement if earned, null otherwise
   */
  private async checkCategoryMastery(userId: number, category: string): Promise<Achievement | null> {
    try {
      // Get user's category stats
      const stats = await db
        .select()
        .from(userQuizStats)
        .where(eq(userQuizStats.userId, userId))
        .limit(1);

      if (stats.length === 0) {
        return null;
      }

      const categoryStats = (stats[0].categoryStats as Record<string, any>) || {};
      const catStats = categoryStats[category];

      if (!catStats) {
        return null;
      }

      // Award category master if: 10+ attempts with 85%+ average score
      const averageScore = (catStats.averageScore || 0) / 100;
      const attempts = catStats.attempts || 0;

      if (attempts >= 10 && averageScore >= 85) {
        return await this.unlockAchievement(userId, 'category_master');
      }

      return null;
    } catch (error) {
      console.error('Error checking category mastery:', error);
      return null;
    }
  }

  /**
   * Check and award quiz marathon achievements
   * Requirements: 26.4
   * 
   * @param userId - User ID
   * @returns Achievement if earned, null otherwise
   */
  private async checkQuizMarathon(userId: number): Promise<Achievement | null> {
    try {
      // Get user's total attempts
      const stats = await db
        .select()
        .from(userQuizStats)
        .where(eq(userQuizStats.userId, userId))
        .limit(1);

      if (stats.length === 0) {
        return null;
      }

      const totalAttempts = stats[0].totalAttempts || 0;

      // Award quiz marathon for 50+ total attempts
      if (totalAttempts >= 50) {
        return await this.unlockAchievement(userId, 'quiz_marathon');
      }

      return null;
    } catch (error) {
      console.error('Error checking quiz marathon:', error);
      return null;
    }
  }

  /**
   * Helper method to get achievement name from badge type
   * 
   * @param badgeType - Badge type
   * @returns Human-readable achievement name
   */
  private getAchievementName(badgeType: string): string {
    const names: Record<string, string> = {
      gold_badge: 'Gold Badge',
      silver_badge: 'Silver Badge',
      bronze_badge: 'Bronze Badge',
      perfect_score: 'Perfect Score',
      speed_demon: 'Speed Demon',
      category_master: 'Category Master',
      streak_warrior: 'Streak Warrior',
      quiz_marathon: 'Quiz Marathon',
      improvement_star: 'Improvement Star',
    };

    return names[badgeType] || 'Achievement';
  }

  /**
   * Helper method to get achievement details
   * 
   * @param achievementType - Achievement type
   * @returns Achievement details
   */
  private getAchievementDetails(achievementType: AchievementType): {
    name: string;
    description: string;
    level: number;
  } {
    const details: Record<AchievementType, { name: string; description: string; level: number }> = {
      perfect_score: {
        name: 'Perfect Score',
        description: 'Achieved 100% accuracy on a quiz',
        level: 1,
      },
      speed_demon: {
        name: 'Speed Demon',
        description: 'Completed a quiz with high score in record time',
        level: 1,
      },
      category_master: {
        name: 'Category Master',
        description: 'Mastered a category with 10+ attempts and 85%+ average score',
        level: 1,
      },
      streak_warrior: {
        name: 'Streak Warrior',
        description: 'Maintained a 7-day quiz streak',
        level: 1,
      },
      quiz_marathon: {
        name: 'Quiz Marathon',
        description: 'Completed 50+ quizzes',
        level: 1,
      },
      improvement_star: {
        name: 'Improvement Star',
        description: 'Showed significant improvement over time',
        level: 1,
      },
      gold_badge: {
        name: 'Gold Badge',
        description: 'Achieved a score above 90%',
        level: 1,
      },
      silver_badge: {
        name: 'Silver Badge',
        description: 'Achieved a score between 70% and 89%',
        level: 1,
      },
      bronze_badge: {
        name: 'Bronze Badge',
        description: 'Achieved a score between 50% and 69%',
        level: 1,
      },
    };

    return details[achievementType];
  }
}
