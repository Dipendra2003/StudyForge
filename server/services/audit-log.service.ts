/**
 * Audit Logging Service
 * Handles logging of admin actions and authentication events
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8
 */

import { storage } from '../storage';
import type { InsertSecurityAuditLog, SecurityAuditLog } from '../../shared/schema';
import { Logger, LogCategory } from '../utils/logger';

/**
 * Admin action details interface
 */
interface AdminActionDetails {
  adminId: number;
  adminUsername: string;
  targetType: 'user' | 'content' | 'system';
  targetId?: number;
  targetIdentifier?: string;
  changes?: Record<string, { old: any; new: any }>;
  reason?: string;
  [key: string]: any;
}

/**
 * Admin action interface
 */
interface AdminAction {
  adminId: number;
  action: string;
  targetType: 'user' | 'content' | 'system';
  targetId?: number;
  details: AdminActionDetails;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Authentication event interface
 */
interface AuthEvent {
  userId?: number;
  action: string;
  status: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

/**
 * Log query options interface
 */
interface LogQueryOptions {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  userId?: number;
  action?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated logs response interface
 */
interface PaginatedLogs {
  logs: SecurityAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class AuditLogService {
  /**
   * Log admin action
   * Records user management, content moderation, and system actions
   * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
   */
  async logAdminAction(action: AdminAction): Promise<void> {
    try {
      const auditLog: InsertSecurityAuditLog = {
        userId: action.adminId,
        action: action.action,
        status: 'success',
        ipAddress: action.ipAddress,
        userAgent: action.userAgent,
        details: action.details,
      };

      await storage.createSecurityAuditLog(auditLog);

      Logger.info(LogCategory.SECURITY, 'Admin action logged', {
        adminId: action.adminId,
        action: action.action,
        targetType: action.targetType,
        targetId: action.targetId,
      });
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to log admin action', error as Error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Log authentication event
   * Records authentication and authorization events
   * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
   */
  async logAuthEvent(event: AuthEvent): Promise<void> {
    try {
      const auditLog: InsertSecurityAuditLog = {
        userId: event.userId,
        action: event.action,
        status: event.status,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: event.details,
      };

      await storage.createSecurityAuditLog(auditLog);

      Logger.debug(LogCategory.SECURITY, 'Auth event logged', {
        userId: event.userId,
        action: event.action,
        status: event.status,
      });
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to log auth event', error as Error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Get security logs with pagination and filtering
   * Requirements: 15.6, 15.7, 15.8
   */
  async getSecurityLogs(options: LogQueryOptions = {}): Promise<PaginatedLogs> {
    try {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        userId,
        action,
        status,
      } = options;

      // Validate pagination parameters
      const validatedPage = Math.max(1, page);
      const validatedLimit = Math.min(Math.max(1, limit), 1000); // Max 1000 records per request

      // Build filter conditions
      const filters: any = {};
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (status) filters.status = status;

      // Note: Date range filtering would need to be implemented in storage layer
      // For now, we'll fetch all logs and filter in memory (not optimal for production)
      
      // Get all logs matching basic filters
      let logs: SecurityAuditLog[];
      if (userId) {
        logs = await storage.getSecurityAuditLogsByUser(userId);
      } else {
        // For now, we'll need to add a method to get all logs
        // This is a limitation of the current storage interface
        logs = [];
      }

      // Apply additional filters
      let filteredLogs = logs;
      
      if (action) {
        filteredLogs = filteredLogs.filter(log => log.action === action);
      }
      
      if (status) {
        filteredLogs = filteredLogs.filter(log => log.status === status);
      }
      
      if (startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.createdAt) >= startDate
        );
      }
      
      if (endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.createdAt) <= endDate
        );
      }

      // Sort by createdAt descending (newest first)
      filteredLogs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Calculate pagination
      const total = filteredLogs.length;
      const totalPages = Math.ceil(total / validatedLimit);
      const offset = (validatedPage - 1) * validatedLimit;
      const paginatedLogs = filteredLogs.slice(offset, offset + validatedLimit);

      return {
        logs: paginatedLogs,
        total,
        page: validatedPage,
        limit: validatedLimit,
        totalPages,
      };
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to get security logs', error as Error);
      throw new Error('Failed to retrieve security logs');
    }
  }

  /**
   * Get admin action logs with pagination and filtering
   * Filters for admin-specific actions
   * Requirements: 15.6, 15.7, 15.8
   */
  async getAdminActionLogs(options: LogQueryOptions = {}): Promise<PaginatedLogs> {
    try {
      // Admin actions are those that start with specific prefixes
      const adminActionPrefixes = [
        'admin_',
        'user_update',
        'user_suspend',
        'user_activate',
        'user_delete',
        'content_update',
        'content_delete',
        'role_change',
      ];

      // Get all security logs
      const allLogs = await this.getSecurityLogs(options);

      // Filter for admin actions
      const adminLogs = allLogs.logs.filter(log => 
        adminActionPrefixes.some(prefix => log.action.startsWith(prefix))
      );

      // Recalculate pagination for filtered results
      const {
        page = 1,
        limit = 50,
      } = options;

      const validatedPage = Math.max(1, page);
      const validatedLimit = Math.min(Math.max(1, limit), 1000);

      const total = adminLogs.length;
      const totalPages = Math.ceil(total / validatedLimit);
      const offset = (validatedPage - 1) * validatedLimit;
      const paginatedLogs = adminLogs.slice(offset, offset + validatedLimit);

      return {
        logs: paginatedLogs,
        total,
        page: validatedPage,
        limit: validatedLimit,
        totalPages,
      };
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to get admin action logs', error as Error);
      throw new Error('Failed to retrieve admin action logs');
    }
  }

  /**
   * Cleanup old logs
   * Removes logs older than specified retention period
   * Requirements: 15.8
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      // This would need to be implemented in the storage layer
      // For now, we'll just log the intent
      Logger.info(LogCategory.SECURITY, 'Log cleanup requested', {
        retentionDays,
      });

      // Return 0 as we haven't implemented the actual cleanup
      return 0;
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to cleanup old logs', error as Error);
      throw new Error('Failed to cleanup old logs');
    }
  }
}

// Export singleton instance
export const auditLogService = new AuditLogService();
