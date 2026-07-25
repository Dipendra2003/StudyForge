/**
 * User Security Routes
 * Handles user's own security features: email change, login history, account recovery
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { adminSecurityService } from '../../services/admin-security.service';
import { db } from '../../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { Logger, LogCategory } from '../../utils/logger';
import { z } from 'zod';
import bcrypt from 'bcrypt';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

/**
 * GET /api/user/security/login-history
 * Get current user's login history
 */
router.get('/login-history', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await adminSecurityService.getUserLoginHistory(userId, limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    Logger.error(LogCategory.SECURITY, 'Failed to get login history', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve login history',
      code: 'LOGIN_HISTORY_ERROR',
    });
  }
});

/**
 * POST /api/user/security/change-email
 * Initiate email change process
 */
router.post('/change-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      newEmail: z.string().email(),
      password: z.string().min(1),
    });

    const { newEmail, password } = schema.parse(req.body);
    const userId = req.user!.id;

    // Verify password
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid password',
        code: 'INVALID_PASSWORD',
      });
      return;
    }

    // Initiate email change
    await adminSecurityService.initiateEmailChange(userId, newEmail);

    res.json({
      success: true,
      message: 'Verification email sent to new address. Please check your email.',
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

    Logger.error(LogCategory.SECURITY, 'Failed to initiate email change', error as Error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to change email',
      code: 'EMAIL_CHANGE_ERROR',
    });
  }
});

/**
 * POST /api/user/security/verify-email-change
 * Verify and complete email change
 */
router.post('/verify-email-change', async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      token: z.string().min(1),
      otp: z.string().length(6),
    });

    const { token, otp } = schema.parse(req.body);
    const userId = req.user!.id;

    await adminSecurityService.verifyEmailChange(userId, token, otp);

    res.json({
      success: true,
      message: 'Email changed successfully',
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

    Logger.error(LogCategory.SECURITY, 'Failed to verify email change', error as Error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify email change',
      code: 'EMAIL_VERIFICATION_ERROR',
    });
  }
});

/**
 * POST /api/user/security/set-backup-email
 * Set backup email for account recovery
 */
router.post('/set-backup-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      backupEmail: z.string().email(),
      password: z.string().min(1),
    });

    const { backupEmail, password } = schema.parse(req.body);
    const userId = req.user!.id;

    // Verify password
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid password',
        code: 'INVALID_PASSWORD',
      });
      return;
    }

    // Update backup email
    await db.update(users)
      .set({ backupEmail, updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: 'Backup email set successfully',
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

    Logger.error(LogCategory.SECURITY, 'Failed to set backup email', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to set backup email',
      code: 'BACKUP_EMAIL_ERROR',
    });
  }
});

/**
 * POST /api/user/security/set-security-questions
 * Set security questions for account recovery
 */
router.post('/set-security-questions', async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      password: z.string().min(1),
      question1: z.string().min(5).max(255),
      answer1: z.string().min(2),
      question2: z.string().min(5).max(255),
      answer2: z.string().min(2),
    });

    const { password, question1, answer1, question2, answer2 } = schema.parse(req.body);
    const userId = req.user!.id;

    // Verify password
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid password',
        code: 'INVALID_PASSWORD',
      });
      return;
    }

    // Hash security answers
    const hashedAnswer1 = await bcrypt.hash(answer1.toLowerCase().trim(), 10);
    const hashedAnswer2 = await bcrypt.hash(answer2.toLowerCase().trim(), 10);

    // Update security questions
    await db.update(users)
      .set({
        securityQuestion1: question1,
        securityAnswer1: hashedAnswer1,
        securityQuestion2: question2,
        securityAnswer2: hashedAnswer2,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: 'Security questions set successfully',
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

    Logger.error(LogCategory.SECURITY, 'Failed to set security questions', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to set security questions',
      code: 'SECURITY_QUESTIONS_ERROR',
    });
  }
});

/**
 * GET /api/user/security/recovery-options
 * Get available account recovery options
 */
router.get('/recovery-options', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [user] = await db
      .select({
        hasBackupEmail: users.backupEmail,
        hasSecurityQuestions: users.securityQuestion1,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        hasBackupEmail: !!user.hasBackupEmail,
        hasSecurityQuestions: !!user.hasSecurityQuestions,
      },
    });
  } catch (error) {
    Logger.error(LogCategory.SECURITY, 'Failed to get recovery options', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recovery options',
      code: 'RECOVERY_OPTIONS_ERROR',
    });
  }
});

export default router;
