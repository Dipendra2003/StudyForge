/**
 * Role-Based Authorization Middleware
 * Handles role verification for admin routes
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 16.1, 16.2, 16.5
 */

import type { Request, Response, NextFunction } from 'express';
import { auditLogService } from '../services/audit-log.service';
import { Logger, LogCategory } from '../utils/logger';

/**
 * Require specific role middleware
 * Checks req.user.role against required role
 * Returns 403 for insufficient permissions, 401 for unauthenticated requests
 * Logs all authorization failures to audit log
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User must be authenticated first (requireAuth middleware should run before this)
      if (!req.user) {
        // Log authorization failure for unauthenticated request
        await auditLogService.logAuthEvent({
          action: 'authorization_failure',
          status: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: { 
            reason: 'not_authenticated', 
            requiredRole: role,
            path: req.path 
          }
        });

        Logger.security('Authorization failed - not authenticated', {
          requiredRole: role,
          path: req.path,
        });

        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        });
        return;
      }

      // Check if user has required role
      if (req.user.role !== role) {
        // Log authorization failure for insufficient permissions
        await auditLogService.logAuthEvent({
          userId: req.user.id,
          action: 'authorization_failure',
          status: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: { 
            reason: 'insufficient_permissions', 
            userRole: req.user.role,
            requiredRole: role,
            path: req.path 
          }
        });

        Logger.security('Authorization failed - insufficient permissions', {
          userId: req.user.id,
          username: req.user.username,
          userRole: req.user.role,
          requiredRole: role,
          path: req.path,
        });

        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
        return;
      }

      // Authorization successful
      Logger.debug(LogCategory.SECURITY, 'Authorization successful', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        path: req.path,
      });

      next();
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Authorization error', error as Error);
      res.status(500).json({
        success: false,
        message: 'Authorization error',
        code: 'AUTH_ERROR',
      });
    }
  };
}

/**
 * Require multiple roles middleware (OR logic)
 * Checks if user has any of the specified roles
 * Returns 403 for insufficient permissions, 401 for unauthenticated requests
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export function requireRoles(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User must be authenticated first
      if (!req.user) {
        await auditLogService.logAuthEvent({
          action: 'authorization_failure',
          status: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: { 
            reason: 'not_authenticated', 
            requiredRoles: roles,
            path: req.path 
          }
        });

        Logger.security('Authorization failed - not authenticated', {
          requiredRoles: roles,
          path: req.path,
        });

        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        });
        return;
      }

      // Check if user has any of the required roles
      if (!roles.includes(req.user.role)) {
        await auditLogService.logAuthEvent({
          userId: req.user.id,
          action: 'authorization_failure',
          status: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: { 
            reason: 'insufficient_permissions', 
            userRole: req.user.role,
            requiredRoles: roles,
            path: req.path 
          }
        });

        Logger.security('Authorization failed - insufficient permissions', {
          userId: req.user.id,
          username: req.user.username,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.path,
        });

        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
        return;
      }

      Logger.debug(LogCategory.SECURITY, 'Authorization successful', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        path: req.path,
      });

      next();
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Authorization error', error as Error);
      res.status(500).json({
        success: false,
        message: 'Authorization error',
        code: 'AUTH_ERROR',
      });
    }
  };
}
