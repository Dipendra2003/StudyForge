/**
 * Admin System Monitoring Routes
 * API endpoints for system monitoring and log retrieval
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 16.1, 16.2
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { auditLogService } from '../../services/audit-log.service';
import { storage } from '../../storage';
import { Logger, LogCategory } from '../../utils/logger';
import { desc, and, gte, lte, eq, count } from 'drizzle-orm';
import { db } from '../../db';
import { securityAuditLogs, emailLogs } from '../../../shared/schema';

const router = Router();

/**
 * Apply authentication and authorization middleware to all routes
 * Requirements: 16.1, 16.2
 */
router.use(requireAuth);
router.use(requireRole('admin'));

/**
 * GET /api/admin/logs/security
 * Get security audit logs with pagination and filtering
 * Query params: page, limit, startDate, endDate, userId, action, status
 * Requirements: 7.1, 7.6, 7.7, 7.8
 */
router.get('/logs/security', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000); // Max 1000 records
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const action = req.query.action as string | undefined;
    const status = req.query.status as string | undefined;

    // Validate pagination parameters
    if (page < 1) {
      res.status(400).json({
        success: false,
        message: 'Page must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (limit < 1) {
      res.status(400).json({
        success: false,
        message: 'Limit must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Validate date parameters
    if (startDate && isNaN(startDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid startDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (endDate && isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid endDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Build filter conditions
    const conditions: any[] = [];
    if (userId) conditions.push(eq(securityAuditLogs.userId, userId));
    if (action) conditions.push(eq(securityAuditLogs.action, action));
    if (status) conditions.push(eq(securityAuditLogs.status, status));
    if (startDate) conditions.push(gte(securityAuditLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(securityAuditLogs.createdAt, endDate));

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(securityAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get paginated logs in reverse chronological order (newest first)
    const logs = await db
      .select()
      .from(securityAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(securityAuditLogs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get security logs', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security logs',
      code: 'MONITORING_ERROR',
    });
  }
});

/**
 * GET /api/admin/logs/email
 * Get email logs with status filtering
 * Query params: page, limit, startDate, endDate, userId, status
 * Requirements: 7.2, 7.6, 7.7, 7.8
 */
router.get('/logs/email', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000); // Max 1000 records
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const status = req.query.status as string | undefined;

    // Validate pagination parameters
    if (page < 1) {
      res.status(400).json({
        success: false,
        message: 'Page must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (limit < 1) {
      res.status(400).json({
        success: false,
        message: 'Limit must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Validate date parameters
    if (startDate && isNaN(startDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid startDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (endDate && isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid endDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Build filter conditions
    const conditions: any[] = [];
    if (userId) conditions.push(eq(emailLogs.userId, userId));
    if (status) conditions.push(eq(emailLogs.status, status));
    if (startDate) conditions.push(gte(emailLogs.sentAt, startDate));
    if (endDate) conditions.push(lte(emailLogs.sentAt, endDate));

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(emailLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get paginated logs in reverse chronological order (newest first)
    const logs = await db
      .select()
      .from(emailLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(emailLogs.sentAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get email logs', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve email logs',
      code: 'MONITORING_ERROR',
    });
  }
});

/**
 * GET /api/admin/logs/errors
 * Get application error logs
 * Query params: page, limit, startDate, endDate
 * Requirements: 7.3, 7.6, 7.7, 7.8
 * 
 * Note: This endpoint filters security audit logs for error-related actions
 * In a production system, you might have a separate error_logs table
 */
router.get('/logs/errors', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000); // Max 1000 records
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Validate pagination parameters
    if (page < 1) {
      res.status(400).json({
        success: false,
        message: 'Page must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (limit < 1) {
      res.status(400).json({
        success: false,
        message: 'Limit must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Validate date parameters
    if (startDate && isNaN(startDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid startDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (endDate && isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid endDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Build filter conditions - filter for failure status to get errors
    const conditions: any[] = [eq(securityAuditLogs.status, 'failure')];
    if (startDate) conditions.push(gte(securityAuditLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(securityAuditLogs.createdAt, endDate));

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(securityAuditLogs)
      .where(and(...conditions));

    // Get paginated error logs in reverse chronological order (newest first)
    const logs = await db
      .select()
      .from(securityAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(securityAuditLogs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get error logs', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve error logs',
      code: 'MONITORING_ERROR',
    });
  }
});

/**
 * GET /api/admin/logs/api-usage
 * Get API usage statistics
 * Query params: startDate, endDate
 * Requirements: 7.4, 7.6
 * 
 * Note: This endpoint aggregates security audit logs to provide API usage stats
 * In a production system, you might have dedicated API usage tracking
 */
router.get('/logs/api-usage', async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Validate date parameters
    if (startDate && isNaN(startDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid startDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (endDate && isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid endDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Build filter conditions
    const conditions: any[] = [];
    if (startDate) conditions.push(gte(securityAuditLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(securityAuditLogs.createdAt, endDate));

    // Get all logs for the date range
    const logs = await db
      .select()
      .from(securityAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(securityAuditLogs.createdAt));

    // Aggregate statistics by action type
    const actionStats: Record<string, { count: number; successCount: number; failureCount: number }> = {};
    
    logs.forEach((log: typeof securityAuditLogs.$inferSelect) => {
      if (!actionStats[log.action]) {
        actionStats[log.action] = { count: 0, successCount: 0, failureCount: 0 };
      }
      actionStats[log.action].count++;
      if (log.status === 'success') {
        actionStats[log.action].successCount++;
      } else {
        actionStats[log.action].failureCount++;
      }
    });

    // Convert to array format
    const stats = Object.entries(actionStats).map(([action, data]) => ({
      action,
      totalRequests: data.count,
      successfulRequests: data.successCount,
      failedRequests: data.failureCount,
      successRate: data.count > 0 ? Math.round((data.successCount / data.count) * 100) : 0,
    }));

    // Sort by total requests descending
    stats.sort((a, b) => b.totalRequests - a.totalRequests);

    res.json({
      success: true,
      data: {
        stats,
        totalRequests: logs.length,
        dateRange: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get API usage stats', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API usage statistics',
      code: 'MONITORING_ERROR',
    });
  }
});

/**
 * GET /api/admin/system/ai-quota
 * Get AI quota usage
 * Requirements: 7.5
 * 
 * Note: This is a placeholder implementation
 * In a production system, you would integrate with your AI provider's API
 * to get actual quota usage data
 */
router.get('/system/ai-quota', async (req: Request, res: Response): Promise<void> => {
  try {
    // Placeholder implementation
    // In production, this would query your AI provider's API or a dedicated tracking table
    const quotaData = {
      totalQuota: 1000000, // Total tokens/requests allowed
      usedQuota: 0, // Tokens/requests used
      remainingQuota: 1000000, // Remaining tokens/requests
      quotaPeriod: 'monthly',
      resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      usagePercentage: 0,
    };

    // Try to calculate actual usage from security audit logs if available
    try {
      // Look for AI-related actions in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const aiLogs = await db
        .select()
        .from(securityAuditLogs)
        .where(
          and(
            gte(securityAuditLogs.createdAt, thirtyDaysAgo),
            eq(securityAuditLogs.status, 'success')
          )
        );

      // Count AI-related actions (you would customize this based on your action naming)
      const aiActions = aiLogs.filter((log: typeof securityAuditLogs.$inferSelect) => 
        log.action.includes('ai_') || 
        log.action.includes('generate') ||
        log.action.includes('chat')
      );

      quotaData.usedQuota = aiActions.length;
      quotaData.remainingQuota = quotaData.totalQuota - quotaData.usedQuota;
      quotaData.usagePercentage = Math.round((quotaData.usedQuota / quotaData.totalQuota) * 100);
    } catch (error) {
      Logger.warn(LogCategory.API, 'Could not calculate AI usage from logs', error as Error);
      // Continue with placeholder data
    }

    res.json({
      success: true,
      data: quotaData,
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get AI quota', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI quota usage',
      code: 'MONITORING_ERROR',
    });
  }
});

export default router;
