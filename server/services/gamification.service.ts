import { storage } from '../storage';
import { Logger, LogCategory } from '../utils/logger';

export type GamificationAction =
  | 'QUIZ_OF_THE_DAY'
  | 'QUIZ_COMPLETED'
  | 'DOCUMENT_SUMMARIZED'
  | 'FLASHCARDS_GENERATED'
  | 'CODE_GENERATED'
  | 'STUDY_PLAN_ITEM_COMPLETED'
  | 'STUDY_PLAN_COMPLETED';

const XP_REWARDS: Record<GamificationAction, number> = {
  QUIZ_OF_THE_DAY: 20, // 20 bonus + 30 base completion = 50 Total XP
  QUIZ_COMPLETED: 30,
  DOCUMENT_SUMMARIZED: 20,
  FLASHCARDS_GENERATED: 15,
  CODE_GENERATED: 10,
  STUDY_PLAN_ITEM_COMPLETED: 10,
  STUDY_PLAN_COMPLETED: 100,
};

export class GamificationService {
  /**
   * Calculates the user level based on total XP.
   * Formula: Level = Math.floor(Math.sqrt(XP / 100)) + 1
   * @param xp Total XP
   * @returns Computed level (min 1)
   */
  static calculateLevel(xp: number): number {
    return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
  }

  /**
   * Awards XP to a user for a specific action.
   * Automatically calculates and updates the user's level if they level up.
   * @param userId User ID to reward
   * @param action Gamification action performed
   * @returns Updated user stats including new XP and Level
   */
  static async awardXP(userId: number, action: GamificationAction) {
    try {
      const xpToAward = XP_REWARDS[action];
      if (!xpToAward) {
        Logger.warn(LogCategory.BUSINESS, `No XP reward defined for action: ${action}`);
        return null;
      }

      let currentStats = await storage.getUserStats(userId);
      if (!currentStats) {
        currentStats = await storage.updateUserStats(userId, { xpPoints: 0, level: 1 });
      }

      const currentXP = currentStats.xpPoints || 0;
      const newXP = currentXP + xpToAward;
      const newLevel = this.calculateLevel(newXP);

      const updatedStats = await storage.updateUserStats(userId, {
        xpPoints: newXP,
        level: newLevel,
      });

      Logger.info(LogCategory.BUSINESS, `Awarded ${xpToAward} XP to user ${userId} for ${action}. Total XP: ${newXP}, Level: ${newLevel}`);

      return updatedStats;
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, `Failed to award XP to user ${userId}`, error as Error);
      return null;
    }
  }

  /**
   * Revokes XP from a user for a specific action (e.g., when deleting history).
   * Automatically calculates and updates the user's level if they level down.
   * @param userId User ID to deduct from
   * @param action Gamification action performed
   * @returns Updated user stats including new XP and Level
   */
  static async revokeXP(userId: number, action: GamificationAction) {
    try {
      const xpToRevoke = XP_REWARDS[action];
      if (!xpToRevoke) {
        Logger.warn(LogCategory.BUSINESS, `No XP reward defined for action: ${action}`);
        return null;
      }

      let currentStats = await storage.getUserStats(userId);
      if (!currentStats) {
        return null;
      }

      const currentXP = currentStats.xpPoints || 0;
      // Prevent XP from going below 0
      const newXP = Math.max(0, currentXP - xpToRevoke);
      const newLevel = this.calculateLevel(newXP);

      const updatedStats = await storage.updateUserStats(userId, {
        xpPoints: newXP,
        level: newLevel,
      });

      Logger.info(LogCategory.BUSINESS, `Revoked ${xpToRevoke} XP from user ${userId} for ${action}. Total XP: ${newXP}, Level: ${newLevel}`);

      return updatedStats;
    } catch (error) {
      Logger.error(LogCategory.BUSINESS, `Failed to revoke XP from user ${userId}`, error as Error);
      return null;
    }
  }
}
