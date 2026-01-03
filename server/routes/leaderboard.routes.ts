import type { Request, Response, Router } from "express";
import { LeaderboardService } from "../services/leaderboard.service";
import { requireAuth } from "../middleware/auth.middleware";
import { handleApiError } from "../middleware/errorHandler";
import { Logger, LogCategory } from "../utils/logger";

const leaderboardService = new LeaderboardService();

/**
 * Leaderboard Routes
 * 
 * Requirements: 7.1, 7.2, 7.4, 7.5
 * 
 * Provides endpoints for:
 * - Global leaderboard rankings
 * - Category-filtered leaderboards
 * - Difficulty-filtered leaderboards
 * - User rank retrieval
 */

export function registerLeaderboardRoutes(router: Router): void {
  /**
   * Get global leaderboard
   * GET /api/leaderboard/global
   * 
   * Query params:
   * - limit?: number - Number of entries to return (default: 10)
   * - offset?: number - Pagination offset (default: 0)
   * 
   * Requirements: 7.1, 7.5
   */
  router.get('/api/leaderboard/global', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      Logger.info(LogCategory.API, 'Fetching global leaderboard', { userId, limit, offset });
      
      // Get leaderboard entries
      const entries = await leaderboardService.getGlobalLeaderboard(limit + offset, userId);
      
      // Apply pagination
      const paginatedEntries = entries.slice(offset, offset + limit);
      
      // Get user's rank if not in top results
      let userRank = null;
      const userInResults = paginatedEntries.some(entry => entry.userId === userId);
      
      if (!userInResults && userId) {
        userRank = await leaderboardService.getUserRank(userId);
      }
      
      return res.status(200).json({
        success: true,
        leaderboard: paginatedEntries,
        userRank,
        total: entries.length,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching global leaderboard', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get category leaderboard
   * GET /api/leaderboard/category/:category
   * 
   * Query params:
   * - limit?: number - Number of entries to return (default: 10)
   * - offset?: number - Pagination offset (default: 0)
   * 
   * Requirements: 7.2, 7.5
   */
  router.get('/api/leaderboard/category/:category', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const category = req.params.category;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      Logger.info(LogCategory.API, 'Fetching category leaderboard', { userId, category, limit, offset });
      
      // Get leaderboard entries
      const entries = await leaderboardService.getCategoryLeaderboard(category, limit + offset, userId);
      
      // Apply pagination
      const paginatedEntries = entries.slice(offset, offset + limit);
      
      // Get user's rank if not in top results
      let userRank = null;
      const userInResults = paginatedEntries.some(entry => entry.userId === userId);
      
      if (!userInResults && userId) {
        userRank = await leaderboardService.getUserCategoryRank(userId, category);
      }
      
      return res.status(200).json({
        success: true,
        leaderboard: paginatedEntries,
        userRank,
        category,
        total: entries.length,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching category leaderboard', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get difficulty leaderboard
   * GET /api/leaderboard/difficulty/:difficulty
   * 
   * Query params:
   * - limit?: number - Number of entries to return (default: 10)
   * - offset?: number - Pagination offset (default: 0)
   * 
   * Requirements: 7.2, 7.5
   */
  router.get('/api/leaderboard/difficulty/:difficulty', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const difficulty = req.params.difficulty as 'easy' | 'medium' | 'hard';
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Validate difficulty
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DIFFICULTY',
            message: 'Difficulty must be easy, medium, or hard',
          },
        });
      }
      
      Logger.info(LogCategory.API, 'Fetching difficulty leaderboard', { userId, difficulty, limit, offset });
      
      // Get leaderboard entries
      const entries = await leaderboardService.getDifficultyLeaderboard(difficulty, limit + offset, userId);
      
      // Apply pagination
      const paginatedEntries = entries.slice(offset, offset + limit);
      
      // Get user's rank (not implemented in service yet, would need similar method)
      let userRank = null;
      const userInResults = paginatedEntries.some(entry => entry.userId === userId);
      
      if (!userInResults && userId) {
        // For now, calculate rank from entries
        const allEntries = await leaderboardService.getDifficultyLeaderboard(difficulty, 1000, userId);
        const userIndex = allEntries.findIndex(entry => entry.userId === userId);
        userRank = userIndex !== -1 ? userIndex + 1 : null;
      }
      
      return res.status(200).json({
        success: true,
        leaderboard: paginatedEntries,
        userRank,
        difficulty,
        total: entries.length,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching difficulty leaderboard', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get user's rank
   * GET /api/leaderboard/rank
   * 
   * Query params:
   * - type?: 'global' | 'category' | 'difficulty' - Leaderboard type (default: 'global')
   * - filter?: string - Category or difficulty filter
   * 
   * Requirements: 7.4
   */
  router.get('/api/leaderboard/rank', requireAuth, async (req: Request, res: Response) => {
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
      
      const type = (req.query.type as string) || 'global';
      const filter = req.query.filter as string;
      
      Logger.info(LogCategory.API, 'Fetching user rank', { userId, type, filter });
      
      let rank: number | null = null;
      
      if (type === 'global') {
        rank = await leaderboardService.getUserRank(userId);
      } else if (type === 'category' && filter) {
        rank = await leaderboardService.getUserCategoryRank(userId, filter);
      }
      
      return res.status(200).json({
        success: true,
        rank,
        type,
        filter,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching user rank', error as Error);
      return handleApiError(error, res);
    }
  });
}
