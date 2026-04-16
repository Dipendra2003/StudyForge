/**
 * Admin Analytics Routes
 * API endpoints for analytics dashboard
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 16.1, 16.2
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { adminAnalyticsService } from '../../services/admin-analytics.service';
import { Logger, LogCategory } from '../../utils/logger';

const router = Router();

/**
 * Apply authentication and authorization middleware to all routes
 * Requirements: 16.1, 16.2
 */
router.use(requireAuth);
router.use(requireRole('admin'));

/**
 * GET /api/admin/analytics/users/total
 * Get total user count
 * Requirements: 6.1
 */
router.get('/users/total', async (req: Request, res: Response): Promise<void> => {
  try {
    const total = await adminAnalyticsService.getTotalUsers();

    res.json({
      success: true,
      data: {
        total,
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get total users', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve total users',
      code: 'ANALYTICS_ERROR',
    });
  }
});

/**
 * GET /api/admin/analytics/users/active
 * Get active users count (default: last 30 days)
 * Query params: days (optional)
 * Requirements: 6.2
 */
router.get('/users/active', async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    // Validate days parameter
    if (days < 1 || days > 365) {
      res.status(400).json({
        success: false,
        message: 'Days parameter must be between 1 and 365',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    const activeCount = await adminAnalyticsService.getActiveUsers(days);

    res.json({
      success: true,
      data: {
        activeUsers: activeCount,
        days,
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get active users', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active users',
      code: 'ANALYTICS_ERROR',
    });
  }
});

/**
 * GET /api/admin/analytics/users/growth
 * Get user growth metrics
 * Query params: period (day|week|month)
 * Requirements: 6.7
 */
router.get('/users/growth', async (req: Request, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'day';

    // Validate period parameter
    if (!['day', 'week', 'month'].includes(period)) {
      res.status(400).json({
        success: false,
        message: 'Period must be one of: day, week, month',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    const growthData = await adminAnalyticsService.getUserGrowth(
      period as 'day' | 'week' | 'month'
    );

    res.json({
      success: true,
      data: {
        period,
        growth: growthData,
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get user growth', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user growth metrics',
      code: 'ANALYTICS_ERROR',
    });
  }
});

/**
 * GET /api/admin/analytics/quizzes/total
 * Get total quiz attempts count
 * Requirements: 6.3
 */
router.get('/quizzes/total', async (req: Request, res: Response): Promise<void> => {
  try {
    const total = await adminAnalyticsService.getTotalQuizAttempts();

    res.json({
      success: true,
      data: {
        total,
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get total quiz attempts', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve total quiz attempts',
      code: 'ANALYTICS_ERROR',
    });
  }
});

/**
 * GET /api/admin/analytics/quizzes/score
 * Get average quiz score
 * Requirements: 6.4
 */
router.get('/quizzes/score', async (req: Request, res: Response): Promise<void> => {
  try {
    const averageScore = await adminAnalyticsService.getAverageQuizScore();

    res.json({
      success: true,
      data: {
        averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get average quiz score', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve average quiz score',
      code: 'ANALYTICS_ERROR',
    });
  }
});

/**
 * GET /api/admin/analytics/ai/usage
 * Get AI usage statistics
 * Requirements: 6.5
 */
router.get('/ai/usage', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await adminAnalyticsService.getAIUsageStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get AI usage stats', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI usage statistics',
      code: 'ANALYTICS_ERROR',
    });
  }
});

/**
 * GET /api/admin/analytics/categories
 * Get popular categories
 * Query params: limit (optional, default: 10)
 * Requirements: 6.6
 */
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate limit parameter
    if (limit < 1 || limit > 50) {
      res.status(400).json({
        success: false,
        message: 'Limit parameter must be between 1 and 50',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    const categories = await adminAnalyticsService.getPopularCategories(limit);

    res.json({
      success: true,
      data: {
        categories,
        limit,
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get popular categories', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve popular categories',
      code: 'ANALYTICS_ERROR',
    });
  }
});

/**
 * GET /api/admin/analytics/content
 * Get content creation statistics
 * Requirements: 6.8
 */
router.get('/content', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await adminAnalyticsService.getContentCreationStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get content stats', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve content creation statistics',
      code: 'ANALYTICS_ERROR',
    });
  }
});

export default router;
