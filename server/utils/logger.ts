/**
 * Structured logging utility for authentication and security events
 * Ensures consistent logging format and prevents sensitive data leakage
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export enum LogCategory {
  AUTH = 'AUTH',
  EMAIL = 'EMAIL',
  TOKEN = 'TOKEN',
  SECURITY = 'SECURITY',
  SESSION = 'SESSION', // JWT session management
}

interface LogContext {
  userId?: number;
  username?: string;
  email?: string;
  action?: string;
  method?: 'token' | 'otp';
  success?: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

/**
 * Sanitize context to remove sensitive data before logging
 */
function sanitizeContext(context: LogContext): LogContext {
  const sanitized = { ...context };
  
  // Remove sensitive fields that should never be logged
  const sensitiveFields = [
    'password',
    'token',
    'otp',
    'verificationToken',
    'verificationOtp',
    'resetToken',
    'resetOtp',
    'hashedPassword',
  ];
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });
  
  // Mask email to show only first 2 chars and domain
  if (sanitized.email) {
    const [localPart, domain] = sanitized.email.split('@');
    if (localPart && domain) {
      sanitized.email = `${localPart.substring(0, 2)}***@${domain}`;
    }
  }
  
  return sanitized;
}

/**
 * Format log message with timestamp, level, category, and context
 */
function formatLogMessage(
  level: LogLevel,
  category: LogCategory,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const sanitizedContext = context ? sanitizeContext(context) : {};
  const contextStr = Object.keys(sanitizedContext).length > 0 
    ? ` | ${JSON.stringify(sanitizedContext)}` 
    : '';
  
  return `[${timestamp}] [${level}] [${category}] ${message}${contextStr}`;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  /**
   * Log authentication events (login, logout, registration)
   */
  static auth(message: string, context?: LogContext): void {
    const logMessage = formatLogMessage(LogLevel.INFO, LogCategory.AUTH, message, context);
    console.log(logMessage);
  }

  /**
   * Log email sending events
   */
  static email(message: string, context?: LogContext): void {
    const logMessage = formatLogMessage(LogLevel.INFO, LogCategory.EMAIL, message, context);
    console.log(logMessage);
  }

  /**
   * Log email errors
   */
  static emailError(message: string, error: any, context?: LogContext): void {
    const errorContext = {
      ...context,
      errorMessage: error?.message || String(error),
      errorName: error?.name,
    };
    const logMessage = formatLogMessage(LogLevel.ERROR, LogCategory.EMAIL, message, errorContext);
    console.error(logMessage);
  }

  /**
   * Log token and OTP generation events
   */
  static tokenGenerated(message: string, context?: LogContext): void {
    const logMessage = formatLogMessage(LogLevel.INFO, LogCategory.TOKEN, message, context);
    console.log(logMessage);
  }

  /**
   * Log verification attempts (email verification, password reset)
   */
  static verification(message: string, context?: LogContext): void {
    const logMessage = formatLogMessage(LogLevel.INFO, LogCategory.SECURITY, message, context);
    console.log(logMessage);
  }

  /**
   * Log security events (failed attempts, suspicious activity)
   */
  static security(message: string, context?: LogContext): void {
    const logMessage = formatLogMessage(LogLevel.WARN, LogCategory.SECURITY, message, context);
    console.warn(logMessage);
  }

  /**
   * Log JWT session events (token refresh, session validation)
   */
  static session(message: string, context?: LogContext): void {
    const logMessage = formatLogMessage(LogLevel.INFO, LogCategory.SESSION, message, context);
    console.log(logMessage);
  }

  /**
   * Log JWT session errors
   */
  static sessionError(message: string, error: any, context?: LogContext): void {
    const errorContext = {
      ...context,
      errorMessage: error?.message || String(error),
      errorName: error?.name,
    };
    const logMessage = formatLogMessage(LogLevel.ERROR, LogCategory.SESSION, message, errorContext);
    console.error(logMessage);
  }

  /**
   * Log general errors
   */
  static error(category: LogCategory, message: string, error: any, context?: LogContext): void {
    const errorContext = {
      ...context,
      errorMessage: error?.message || String(error),
      errorName: error?.name,
      errorStack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    };
    const logMessage = formatLogMessage(LogLevel.ERROR, category, message, errorContext);
    console.error(logMessage);
  }

  /**
   * Log debug information (only in development)
   */
  static debug(category: LogCategory, message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = formatLogMessage(LogLevel.DEBUG, category, message, context);
      console.log(logMessage);
    }
  }
}
