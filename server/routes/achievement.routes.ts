import type { Request, Response, Router } from "express";
import { AchievementService } from "../services/achievement.service";
import { requireAuth } from "../middleware/auth.middleware";
import { handleApiError } from "../middleware/errorHandler";
import { Logger, LogCategory } from "../utils/logger";

const achievementService = new AchievementService();

/**
 * Achievement Routes
 * 
 * Requirements: 9.4, 9.5, 26.2, 26.3
 * 
 * Provides endpoints for:
 * - Retrieving user achievements
 * - Getting achievement details
 * - Getting badge progress toward locked badges
 */

export function registerAchievementRoutes(router: Router): void {
  /**
   * Get user's achievements
   * GET /api/achievements
   * 
   * Requirements: 9.5, 26.3
   */
  router.get('/api/achievements', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }
      
      Logger.info(LogCategory.API, 'Fetching user achievements', { userId });
      
      const achievements = await achievementService.getUserAchievements(userId);
      
      return res.status(200).json({
        success: true,
        achievements,
        total: achievements.length,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching user achievements', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get badge progress for current user
   * GET /api/achievements/progress
   * 
   * Returns progress data for all badge types showing how close the user
   * is to earning each badge.
   */
  router.get('/api/achievements/progress', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }
      
      Logger.info(LogCategory.API, 'Fetching badge progress', { userId });
      
      const progress = await achievementService.getBadgeProgress(userId);
      
      return res.status(200).json({
        success: true,
        progress,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching badge progress', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get user's achievements by user ID (for viewing other users' achievements)
   * GET /api/achievements/user/:userId
   * 
   * Requirements: 9.5
   */
  router.get('/api/achievements/user/:userId', requireAuth, async (req: Request, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      
      if (isNaN(targetUserId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_ID',
            message: 'Invalid user ID provided',
          },
        });
      }
      
      Logger.info(LogCategory.API, 'Fetching achievements for user', { targetUserId });
      
      const achievements = await achievementService.getUserAchievements(targetUserId);
      
      return res.status(200).json({
        success: true,
        achievements,
        total: achievements.length,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching user achievements', error as Error);
      return handleApiError(error, res);
    }
  });
}
