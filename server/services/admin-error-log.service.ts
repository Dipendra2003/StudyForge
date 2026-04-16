import { db } from '../db';
import { securityAuditLogs } from '../../shared/schema';
import { Logger, LogCategory } from '../utils/logger';

/**
 * Admin Error Logging Service
 * Logs errors from admin panel operations for monitoring and debugging
 * Requirements: 19.7
 */

interface AdminErrorLog {
  userId?: number;
  action: string;
  errorMessage: string;
  errorStack?: string;
  requestPath?: string;
  requestMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

class AdminErrorLogService {
  /**
   * Log an error from admin panel operations
   */
  async logAdminError(errorLog: AdminErrorLog): Promise<void> {
    try {
      // Log to security audit logs table with error status
      await db.insert(securityAuditLogs).values({
        userId: errorLog.userId || null,
        action: `admin_error_${errorLog.action}`,
        status: 'failure',
        ipAddress: errorLog.ipAddress || null,
        userAgent: errorLog.userAgent || null,
        details: {
          errorMessage: errorLog.errorMessage,
          errorStack: errorLog.errorStack,
          requestPath: errorLog.requestPath,
          requestMethod: errorLog.requestMethod,
          ...errorLog.details,
        },
      });

      // Also log to application logger for immediate visibility
      Logger.error(LogCategory.SYSTEM, 'Admin panel error', new Error(errorLog.errorMessage), {
        userId: errorLog.userId,
        action: errorLog.action,
        requestPath: errorLog.requestPath,
        requestMethod: errorLog.requestMethod,
        ipAddress: errorLog.ipAddress,
      });
    } catch (logError) {
      // If logging fails, at least log to console
      Logger.error(LogCategory.SYSTEM, 'Failed to log admin error', logError as Error, {
        originalError: errorLog.errorMessage,
      });
    }
  }

  /**
   * Log a frontend error from admin panel
   */
  async logFrontendError(
    userId: number | undefined,
    errorMessage: string,
    errorStack: string | undefined,
    url: string,
    userAgent: string | undefined
  ): Promise<void> {
    await this.logAdminError({
      userId,
      action: 'frontend_error',
      errorMessage,
      errorStack,
      requestPath: url,
      requestMethod: 'CLIENT',
      userAgent,
      details: {
        source: 'admin_panel_frontend',
      },
    });
  }

  /**
   * Log a validation error from admin operations
   */
  async logValidationError(
    userId: number,
    action: string,
    validationErrors: Array<{ field: string; message: string }>,
    ipAddress?: string
  ): Promise<void> {
    await this.logAdminError({
      userId,
      action: `validation_${action}`,
      errorMessage: 'Validation failed',
      ipAddress,
      details: {
        validationErrors,
      },
    });
  }

  /**
   * Log an authorization failure
   */
  async logAuthorizationFailure(
    userId: number | undefined,
    action: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAdminError({
      userId,
      action: `authorization_failure_${action}`,
      errorMessage: `Authorization failed: ${reason}`,
      ipAddress,
      userAgent,
      details: {
        reason,
      },
    });
  }

  /**
   * Log a database error from admin operations
   */
  async logDatabaseError(
    userId: number,
    action: string,
    errorMessage: string,
    errorStack?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logAdminError({
      userId,
      action: `database_error_${action}`,
      errorMessage,
      errorStack,
      ipAddress,
      details: {
        errorType: 'database',
      },
    });
  }
}

export const adminErrorLogService = new AdminErrorLogService();
