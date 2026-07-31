import { db } from '../db';
import { achievements, userQuizStats, quizAttempts, quizOfTheDayCompletions } from '../../shared/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { Logger, LogCategory } from '../utils/logger';

/**
 * AchievementService - Manage badges and achievements
 * 
 * This service provides achievement and badge functionality including
 * badge awards based on performance, milestone tracking, and achievement retrieval.
 * 
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
  | 'bronze_badge'
  | 'flawless_master'
  | 'polymath'
  | 'qotd_champion'
  | 'night_owl';

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

export interface BadgeProgress {
  type: string;
  name: string;
  current: number;
  target: number;
  percentage: number;
  detail: string;
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

      // Check for improvement star (score improvement over time)
      const improvementAchievement = await this.checkImprovementStar(userId);
      if (improvementAchievement) {
        newAchievements.push(improvementAchievement);
      }

      // Check for flawless master (100% on hard)
      if (results.accuracy === 100 && results.difficulty === 'hard') {
        const flawlessMaster = await this.unlockAchievement(userId, 'flawless_master');
        if (flawlessMaster) newAchievements.push(flawlessMaster);
      }

      // Check for night owl (between 00:00 and 04:00)
      const currentHour = new Date().getHours();
      if (currentHour >= 0 && currentHour < 4) {
        const nightOwl = await this.unlockAchievement(userId, 'night_owl');
        if (nightOwl) newAchievements.push(nightOwl);
      }

      // Check for polymath (5 different categories)
      const polymath = await this.checkPolymath(userId);
      if (polymath) newAchievements.push(polymath);

      // Check for QOTD champion
      const qotdChampion = await this.checkQotdChampion(userId);
      if (qotdChampion) newAchievements.push(qotdChampion);

      return newAchievements;
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error checking and awarding badges', error as Error);
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
      const created = await db.insert(achievements).values({
        userId,
        badge: badgeType,
        description,
        level: 1,
      }).returning();

      if (created.length === 0) {
        return null;
      }

      Logger.info(LogCategory.BUSINESS, `Awarded ${badgeName} to user ${userId} (score: ${score}%)`);

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
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return null; // Race condition: badge was just awarded by another concurrent request
      }
      Logger.error(LogCategory.BUSINESS, 'Error awarding score badge', error as Error);
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
      Logger.error(LogCategory.BUSINESS, 'Error getting user achievements', error as Error);
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
      const created = await db.insert(achievements).values({
        userId,
        badge: achievementType,
        description: achievementDetails.description,
        level: achievementDetails.level,
      }).returning();

      if (created.length === 0) {
        return null;
      }

      Logger.info(LogCategory.BUSINESS, `Unlocked achievement ${achievementDetails.name} for user ${userId}`);

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
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return null; // Race condition: badge was just awarded by another concurrent request
      }
      Logger.error(LogCategory.BUSINESS, 'Error unlocking achievement', error as Error);
      return null;
    }
  }

  /**
   * Get badge progress for all badge types for a user.
   * Returns how close the user is to earning each badge.
   * 
   * @param userId - User ID
   * @returns Array of progress data for all badge types
   */
  async getBadgeProgress(userId: number): Promise<BadgeProgress[]> {
    try {
      const progress: BadgeProgress[] = [];

      // Get user quiz stats
      const stats = await db
        .select()
        .from(userQuizStats)
        .where(eq(userQuizStats.userId, userId))
        .limit(1);

      const userStats = stats.length > 0 ? stats[0] : null;

      // Get user's highest score from quiz attempts
      const highestScoreResult = await db
        .select({ maxScore: sql<number>`MAX(${quizAttempts.score})` })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));
      const highestScore = highestScoreResult[0]?.maxScore || 0;

      // Get user's best speed ratio (score > 80 attempts only)
      const speedAttempts = await db
        .select({
          score: quizAttempts.score,
          timeSpent: quizAttempts.timeSpent,
          totalQuestions: quizAttempts.totalQuestions,
        })
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.userId, userId),
          sql`${quizAttempts.score} > 80`
        ))
        .orderBy(asc(quizAttempts.timeSpent))
        .limit(1);

      // Get total quiz count
      const totalCountResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));
      const totalQuizzes = totalCountResult[0]?.count || 0;

      // Get highest accuracy
      const highestAccuracyResult = await db
        .select({
          maxAccuracy: sql<number>`MAX(ROUND(${quizAttempts.correctAnswers} * 100.0 / ${quizAttempts.totalQuestions}))`,
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));
      const highestAccuracy = highestAccuracyResult[0]?.maxAccuracy || 0;

      // Gold Badge progress
      progress.push({
        type: 'gold_badge',
        name: 'Gold Badge',
        current: Math.min(highestScore, 100),
        target: 90,
        percentage: Math.min(100, Math.round((highestScore / 90) * 100)),
        detail: `Best score: ${highestScore}% (need 90%)`,
      });

      // Silver Badge progress
      progress.push({
        type: 'silver_badge',
        name: 'Silver Badge',
        current: Math.min(highestScore, 89),
        target: 70,
        percentage: Math.min(100, Math.round((highestScore / 70) * 100)),
        detail: `Best score: ${highestScore}% (need 70%)`,
      });

      // Bronze Badge progress
      progress.push({
        type: 'bronze_badge',
        name: 'Bronze Badge',
        current: Math.min(highestScore, 69),
        target: 50,
        percentage: Math.min(100, Math.round((highestScore / 50) * 100)),
        detail: `Best score: ${highestScore}% (need 50%)`,
      });

      // Perfect Score progress
      progress.push({
        type: 'perfect_score',
        name: 'Perfect Score',
        current: Math.round(highestAccuracy),
        target: 100,
        percentage: Math.round(highestAccuracy),
        detail: `Best accuracy: ${Math.round(highestAccuracy)}% (need 100%)`,
      });

      // Speed Demon progress
      if (speedAttempts.length > 0) {
        const attempt = speedAttempts[0];
        const timePerQ = attempt.timeSpent && attempt.totalQuestions 
          ? Math.round(attempt.timeSpent / attempt.totalQuestions) 
          : 999;
        const speedPct = Math.min(100, Math.round((10 / Math.max(timePerQ, 1)) * 100));
        progress.push({
          type: 'speed_demon',
          name: 'Speed Demon',
          current: timePerQ,
          target: 10,
          percentage: speedPct,
          detail: `Best: ${timePerQ}s/question with 80%+ score (need <10s)`,
        });
      } else {
        progress.push({
          type: 'speed_demon',
          name: 'Speed Demon',
          current: 0,
          target: 10,
          percentage: 0,
          detail: `Score 80%+ first, then beat 10s/question`,
        });
      }

      // Streak Warrior progress
      const currentStreak = userStats?.currentStreak || 0;
      progress.push({
        type: 'streak_warrior',
        name: 'Streak Warrior',
        current: currentStreak,
        target: 7,
        percentage: Math.min(100, Math.round((currentStreak / 7) * 100)),
        detail: `Current streak: ${currentStreak} days (need 7)`,
      });

      // Category Master progress
      const categoryStats = (userStats?.categoryStats as Record<string, any>) || {};
      let bestCatName = 'None';
      let bestCatAttempts = 0;
      let bestCatAvg = 0;
      for (const [cat, catData] of Object.entries(categoryStats)) {
        const attempts = catData?.attempts || 0;
        const avg = (catData?.averageScore || 0) / 100;
        if (attempts > bestCatAttempts || (attempts === bestCatAttempts && avg > bestCatAvg)) {
          bestCatName = cat;
          bestCatAttempts = attempts;
          bestCatAvg = avg;
        }
      }
      const catProgress = Math.min(100, Math.round(
        ((Math.min(bestCatAttempts, 10) / 10) * 50) + 
        ((Math.min(bestCatAvg, 85) / 85) * 50)
      ));
      progress.push({
        type: 'category_master',
        name: 'Category Master',
        current: bestCatAttempts,
        target: 10,
        percentage: catProgress,
        detail: `Best: ${bestCatName} (${bestCatAttempts}/10 attempts, ${Math.round(bestCatAvg)}% avg)`,
      });

      // Quiz Marathon progress
      progress.push({
        type: 'quiz_marathon',
        name: 'Quiz Marathon',
        current: Number(totalQuizzes),
        target: 50,
        percentage: Math.min(100, Math.round((Number(totalQuizzes) / 50) * 100)),
        detail: `${totalQuizzes}/50 quizzes completed`,
      });

      // Improvement Star progress
      const improvementData = await this.getImprovementData(userId);
      progress.push({
        type: 'improvement_star',
        name: 'Improvement Star',
        current: Math.round(improvementData.improvementPct),
        target: 20,
        percentage: Math.min(100, Math.round((improvementData.improvementPct / 20) * 100)),
        detail: improvementData.detail,
      });

      // Flawless Master progress
      const hardAttempts = await db
        .select({
          maxAccuracy: sql<number>`MAX(ROUND(${quizAttempts.correctAnswers} * 100.0 / ${quizAttempts.totalQuestions}))`,
        })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.difficulty, 'hard')));
      const hardAccuracy = hardAttempts[0]?.maxAccuracy || 0;
      progress.push({
        type: 'flawless_master',
        name: 'Flawless Master',
        current: Math.round(hardAccuracy),
        target: 100,
        percentage: Math.round(hardAccuracy),
        detail: `Best Hard Accuracy: ${Math.round(hardAccuracy)}% (need 100%)`,
      });

      // Jack of All Trades (Polymath) progress
      const distinctCats = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${quizAttempts.category})` })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));
      const catCount = distinctCats[0]?.count || 0;
      progress.push({
        type: 'polymath',
        name: 'Jack of All Trades',
        current: Number(catCount),
        target: 5,
        percentage: Math.min(100, Math.round((Number(catCount) / 5) * 100)),
        detail: `${catCount}/5 distinct categories played`,
      });

      // QOTD Champion progress
      const qotdCompletions = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(quizOfTheDayCompletions)
        .where(eq(quizOfTheDayCompletions.userId, userId));
      const qotdCount = qotdCompletions[0]?.count || 0;
      progress.push({
        type: 'qotd_champion',
        name: 'QOTD Champion',
        current: Number(qotdCount),
        target: 7,
        percentage: Math.min(100, Math.round((Number(qotdCount) / 7) * 100)),
        detail: `${qotdCount}/7 QOTD completed`,
      });

      // Night Owl progress
      progress.push({
        type: 'night_owl',
        name: 'Night Owl',
        current: 0,
        target: 1,
        percentage: 0,
        detail: `Complete a quiz between 12:00 AM and 4:00 AM`,
      });

      return progress;
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error getting badge progress', error as Error);
      return [];
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
      Logger.error(LogCategory.BUSINESS, 'Error checking streak achievements', error as Error);
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
      Logger.error(LogCategory.BUSINESS, 'Error checking category mastery', error as Error);
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
      Logger.error(LogCategory.BUSINESS, 'Error checking quiz marathon', error as Error);
      return null;
    }
  }

  /**
   * Check and award improvement star achievement.
   * Compares user's first 5 quiz scores to last 5 quiz scores.
   * Awards if improvement >= 20%.
   * 
   * @param userId - User ID
   * @returns Achievement if earned, null otherwise
   */
  private async checkImprovementStar(userId: number): Promise<Achievement | null> {
    try {
      const data = await this.getImprovementData(userId);

      if (data.improvementPct >= 20) {
        return await this.unlockAchievement(userId, 'improvement_star');
      }

      return null;
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error checking improvement star', error as Error);
      return null;
    }
  }

  /**
   * Get improvement data by comparing early vs recent quiz scores.
   * 
   * @param userId - User ID
   * @returns Improvement percentage and detail string
   */
  private async getImprovementData(userId: number): Promise<{ improvementPct: number; detail: string }> {
    try {
      // Get earliest 5 quizzes
      const earliestQuizzes = await db
        .select({ score: quizAttempts.score })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
        .orderBy(asc(quizAttempts.createdAt))
        .limit(5);

      // Get latest 5 quizzes
      const latestQuizzes = await db
        .select({ score: quizAttempts.score })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
        .orderBy(desc(quizAttempts.createdAt))
        .limit(5);

      if (earliestQuizzes.length < 5 || latestQuizzes.length < 5) {
        return {
          improvementPct: 0,
          detail: `Need at least 10 quizzes (have ${earliestQuizzes.length + latestQuizzes.length})`,
        };
      }

      const earlyAvg = earliestQuizzes.reduce((sum: number, q: { score: number }) => sum + q.score, 0) / earliestQuizzes.length;
      const recentAvg = latestQuizzes.reduce((sum: number, q: { score: number }) => sum + q.score, 0) / latestQuizzes.length;
      const improvement = recentAvg - earlyAvg;

      return {
        improvementPct: Math.max(0, improvement),
        detail: `Early avg: ${Math.round(earlyAvg)}% → Recent avg: ${Math.round(recentAvg)}% (${improvement >= 0 ? '+' : ''}${Math.round(improvement)}%)`,
      };
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error calculating improvement data', error as Error);
      return { improvementPct: 0, detail: 'Unable to calculate improvement' };
    }
  }

  /**
   * Check and award Polymath (Jack of All Trades) achievement
   */
  private async checkPolymath(userId: number): Promise<Achievement | null> {
    try {
      const result = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${quizAttempts.category})` })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));
        
      const categoryCount = result[0]?.count || 0;
      
      if (categoryCount >= 5) {
        return await this.unlockAchievement(userId, 'polymath');
      }
      return null;
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error checking polymath', error as Error);
      return null;
    }
  }

  /**
   * Check and award QOTD Champion achievement
   */
  private async checkQotdChampion(userId: number): Promise<Achievement | null> {
    try {
      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(quizOfTheDayCompletions)
        .where(eq(quizOfTheDayCompletions.userId, userId));
        
      const count = result[0]?.count || 0;
      
      if (count >= 7) {
        return await this.unlockAchievement(userId, 'qotd_champion');
      }
      return null;
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, 'Error checking QOTD champion', error as Error);
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
      flawless_master: 'Flawless Master',
      polymath: 'Jack of All Trades',
      qotd_champion: 'QOTD Champion',
      night_owl: 'Night Owl',
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
      flawless_master: {
        name: 'Flawless Master',
        description: 'Achieved 100% accuracy on a Hard quiz',
        level: 1,
      },
      polymath: {
        name: 'Jack of All Trades',
        description: 'Completed quizzes in 5 different categories',
        level: 1,
      },
      qotd_champion: {
        name: 'QOTD Champion',
        description: 'Completed the Quiz of the Day 7 times',
        level: 1,
      },
      night_owl: {
        name: 'Night Owl',
        description: 'Completed a quiz between Midnight and 4 AM',
        level: 1,
      },
    };

    return details[achievementType];
  }
}
