/**
 * Admin User Management Routes
 * Handles all user management endpoints for admin panel
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 16.1, 16.2
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { adminUserService } from '../../services/admin-user.service';
import { Logger, LogCategory } from '../../utils/logger';
import { z } from 'zod';

const router = Router();

// Apply auth and role middleware to all routes
router.use(requireAuth);
router.use(requireRole('admin'));

/**
 * GET /api/admin/users
 * Get all users with pagination and search
 * Requirements: 4.1, 4.2
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    
    // Advanced filters
    const role = req.query.role as 'user' | 'admin' | undefined;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const emailVerified = req.query.emailVerified === 'true' ? true : req.query.emailVerified === 'false' ? false : undefined;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    let result;
    
    // Check if advanced filters are being used
    const hasAdvancedFilters = role !== undefined || isActive !== undefined || 
                               emailVerified !== undefined || dateFrom !== undefined || dateTo !== undefined;
    
    if (search && search.trim()) {
      // Search users by username or email
      result = await adminUserService.searchUsers(search.trim(), {
        page,
        limit,
        sortBy,
        sortOrder,
      });
    } else if (hasAdvancedFilters) {
      // Use advanced filtering
      result = await adminUserService.getFilteredUsers({
        page,
        limit,
        sortBy,
        sortOrder,
        role,
        isActive,
        emailVerified,
        dateFrom,
        dateTo,
      });
    } else {
      // Get all users
      result = await adminUserService.getAllUsers({
        page,
        limit,
        sortBy,
        sortOrder,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get users', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      code: 'GET_USERS_ERROR',
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get single user by ID
 * Requirements: 4.2
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    const { storage } = await import('../../storage');
    const user = await storage.getUser(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Remove sensitive fields
    const { password, verificationToken, verificationOtp, resetToken, resetOtp, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser,
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get user', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      code: 'GET_USER_ERROR',
    });
  }
});

/**
 * GET /api/admin/users/:id/activity
 * Get user activity history
 * Requirements: 4.3
 */
router.get('/:id/activity', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    const activity = await adminUserService.getUserActivity(userId);

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get user activity', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user activity',
      code: 'GET_ACTIVITY_ERROR',
    });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user details
 * Requirements: 4.4
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    // Validate update data
    const updateSchema = z.object({
      fullName: z.string().min(1).max(100).optional(),
      email: z.string().email().max(100).optional(),
      role: z.enum(['user', 'admin']).optional(),
    });

    const validationResult = updateSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    const updatedUser = await adminUserService.updateUser(
      userId,
      validationResult.data,
      req.user!.id,
      req.user!.username
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Remove sensitive fields
    const { password, verificationToken, verificationOtp, resetToken, resetOtp, ...safeUser } = updatedUser;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: safeUser,
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to update user', error as Error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update user',
      code: 'UPDATE_USER_ERROR',
    });
  }
});

/**
 * PATCH /api/admin/users/:id/suspend
 * Suspend user account
 * Requirements: 4.5
 */
router.patch('/:id/suspend', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    // Prevent admin from suspending themselves
    if (userId === req.user!.id) {
      res.status(400).json({
        success: false,
        message: 'Cannot suspend your own account',
        code: 'CANNOT_SUSPEND_SELF',
      });
      return;
    }

    await adminUserService.suspendUser(
      userId,
      req.user!.id,
      req.user!.username
    );

    res.json({
      success: true,
      message: 'User suspended successfully',
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to suspend user', error as Error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to suspend user',
      code: 'SUSPEND_USER_ERROR',
    });
  }
});

/**
 * PATCH /api/admin/users/:id/activate
 * Activate user account
 * Requirements: 4.6
 */
router.patch('/:id/activate', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    await adminUserService.activateUser(
      userId,
      req.user!.id,
      req.user!.username
    );

    res.json({
      success: true,
      message: 'User activated successfully',
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to activate user', error as Error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to activate user',
      code: 'ACTIVATE_USER_ERROR',
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user permanently
 * Requirements: 4.7
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    // Prevent admin from deleting themselves
    if (userId === req.user!.id) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
        code: 'CANNOT_DELETE_SELF',
      });
      return;
    }

    await adminUserService.deleteUser(
      userId,
      req.user!.id,
      req.user!.username
    );

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to delete user', error as Error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete user',
      code: 'DELETE_USER_ERROR',
    });
  }
});

export default router;
