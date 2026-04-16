import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { adminErrorLogService } from '../../services/admin-error-log.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { z } from 'zod';
import { Logger, LogCategory } from '../../utils/logger';

const router = Router();

// Schema for frontend error logging
const frontendErrorSchema = z.object({
  message: z.string().min(1).max(1000),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  timestamp: z.string(),
  userAgent: z.string().optional(),
  url: z.string().max(500),
});

/**
 * POST /api/admin/logs/errors
 * Log frontend errors from admin panel
 * Requirements: 19.7
 */
router.post(
  '/errors',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const validatedData = frontendErrorSchema.parse(req.body);
    
    const userId = (req as any).user?.id;
    const userAgent = validatedData.userAgent || req.get('user-agent');

    // Log the frontend error
    await adminErrorLogService.logFrontendError(
      userId,
      validatedData.message,
      validatedData.stack,
      validatedData.url,
      userAgent
    );

    Logger.info(LogCategory.SYSTEM, 'Frontend error logged from admin panel', {
      userId,
      message: validatedData.message,
      url: validatedData.url,
    });

    res.status(201).json({
      success: true,
      message: 'Error logged successfully',
    });
  })
);

export default router;
