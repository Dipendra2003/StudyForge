/**
 * Admin Security Routes
 * Handles password resets, email changes, login history, and security alerts
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { adminSecurityService } from '../../services/admin-security.service';
import { Logger, LogCategory } from '../../utils/logger';
import { z } from 'zod';

const router = Router();

// Apply auth and role middleware to all routes
router.use(requireAuth);
router.use(requireRole('admin'));

/**
 * POST /api/admin/security/reset-password/:userId
 * Admin resets user password
 */
router.post('/reset-password/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.user!.id;

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    await adminSecurityService.resetUserPassword(adminId, userId);

    res.json({
      success: true,
      message: 'Password reset successfully. Temporary password sent to user email.',
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to reset user password', error as Error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset password',
      code: 'PASSWORD_RESET_ERROR',
    });
  }
});

/**
 * GET /api/admin/security/login-history/:userId
 * Get login history for a user
 */
router.get('/login-history/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 50;

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    const history = await adminSecurityService.getUserLoginHistory(userId, limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get login history', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve login history',
      code: 'LOGIN_HISTORY_ERROR',
    });
  }
});

/**
 * GET /api/admin/security/suspicious-activity/:userId
 * Detect suspicious activity for a user
 */
router.get('/suspicious-activity/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    const alerts = await adminSecurityService.detectSuspiciousActivity(userId);

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to detect suspicious activity', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect suspicious activity',
      code: 'SUSPICIOUS_ACTIVITY_ERROR',
    });
  }
});

/**
 * POST /api/admin/security/send-alert/:userId
 * Send security alert to user
 */
router.post('/send-alert/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    const alerts = await adminSecurityService.detectSuspiciousActivity(userId);
    
    if (alerts.length > 0) {
      await adminSecurityService.sendSecurityAlert(userId, alerts);
    }

    res.json({
      success: true,
      message: alerts.length > 0 ? 'Security alert sent' : 'No suspicious activity detected',
      data: { alertCount: alerts.length },
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to send security alert', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to send security alert',
      code: 'SEND_ALERT_ERROR',
    });
  }
});

/**
 * POST /api/admin/security/bulk-suspend
 * Bulk suspend users
 */
router.post('/bulk-suspend', async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      userIds: z.array(z.number()).min(1).max(100),
    });

    const { userIds } = schema.parse(req.body);
    const adminId = req.user!.id;

    const result = await adminSecurityService.bulkSuspendUsers(adminId, userIds);

    res.json({
      success: true,
      message: `Suspended ${result.success} users. ${result.failed} failed.`,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors,
      });
      return;
    }

    Logger.error(LogCategory.ADMIN, 'Failed to bulk suspend users', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend users',
      code: 'BULK_SUSPEND_ERROR',
    });
  }
});

/**
 * POST /api/admin/security/bulk-activate
 * Bulk activate users
 */
router.post('/bulk-activate', async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      userIds: z.array(z.number()).min(1).max(100),
    });

    const { userIds } = schema.parse(req.body);
    const adminId = req.user!.id;

    const result = await adminSecurityService.bulkActivateUsers(adminId, userIds);

    res.json({
      success: true,
      message: `Activated ${result.success} users. ${result.failed} failed.`,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors,
      });
      return;
    }

    Logger.error(LogCategory.ADMIN, 'Failed to bulk activate users', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate users',
      code: 'BULK_ACTIVATE_ERROR',
    });
  }
});

/**
 * POST /api/admin/security/bulk-delete
 * Bulk delete users
 */
router.post('/bulk-delete', async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      userIds: z.array(z.number()).min(1).max(100),
    });

    const { userIds } = schema.parse(req.body);
    const adminId = req.user!.id;

    const result = await adminSecurityService.bulkDeleteUsers(adminId, userIds);

    res.json({
      success: true,
      message: `Deleted ${result.success} users. ${result.failed} failed.`,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors,
      });
      return;
    }

    Logger.error(LogCategory.ADMIN, 'Failed to bulk delete users', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete users',
      code: 'BULK_DELETE_ERROR',
    });
  }
});

export default router;
