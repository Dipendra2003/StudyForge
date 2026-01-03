/**
 * Structured logging utility for authentication and security events
 * Ensures consistent logging format and prevents sensitive data leakage
 * Requirements: 7.7, 8.7
 */

import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

export enum LogCategory {
  AUTH = 'AUTH',
  EMAIL = 'EMAIL',
  TOKEN = 'TOKEN',
  SECURITY = 'SECURITY',
  SESSION = 'SESSION', // JWT session management
  SYSTEM = 'SYSTEM', // System-level errors and events
  API = 'API', // API requests and responses
  QUIZ = 'QUIZ', // Quiz-related operations
  BUSINESS = 'BUSINESS', // Business logic operations
  AI = 'AI', // AI service operations (Gemini, question generation)
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
 * Write log to file in production
 */
function writeToLogFile(logMessage: string, level: LogLevel): void {
  // Only write to file in production
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  try {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Determine log file based on level
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFileName = level === LogLevel.ERROR 
      ? `error-${date}.log`
      : `app-${date}.log`;
    const logFilePath = path.join(logsDir, logFileName);

    // Append log message to file
    fs.appendFileSync(logFilePath, logMessage + '\n', 'utf8');
  } catch (error) {
    // If file logging fails, just log to console
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Output log message to console and file (in production)
 */
function outputLog(logMessage: string, level: LogLevel): void {
  // Always log to console
  switch (level) {
    case LogLevel.ERROR:
      console.error(logMessage);
      break;
    case LogLevel.WARN:
      console.warn(logMessage);
      break;
    case LogLevel.DEBUG:
      if (process.env.NODE_ENV === 'development') {
        console.log(logMessage);
      }
      break;
    case LogLevel.INFO:
    default:
      console.log(logMessage);
      break;
  }

  // Write to file in production
  writeToLogFile(logMessage, level);
}

/**
 * Logger class for structured logging
 */
export class Logger {
  /**
   * General logging method with configurable level and category
   */
  static log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: LogContext
  ): void {
    const logMessage = formatLogMessage(level, category, message, context);
    outputLog(logMessage, level);
  }

  /**
   * Log info level messages
   */
  static info(category: LogCategory, message: string, context?: LogContext): void {
    Logger.log(LogLevel.INFO, category, message, context);
  }

  /**
   * Log warning level messages
   */
  static warn(category: LogCategory, message: string, context?: LogContext): void {
    Logger.log(LogLevel.WARN, category, message, context);
  }

  /**
   * Log authentication events (login, logout, registration)
   */
  static auth(message: string, context?: LogContext): void {
    Logger.log(LogLevel.INFO, LogCategory.AUTH, message, context);
  }

  /**
   * Log email sending events
   */
  static email(message: string, context?: LogContext): void {
    Logger.log(LogLevel.INFO, LogCategory.EMAIL, message, context);
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
    Logger.log(LogLevel.ERROR, LogCategory.EMAIL, message, errorContext);
  }

  /**
   * Log token and OTP generation events
   */
  static tokenGenerated(message: string, context?: LogContext): void {
    Logger.log(LogLevel.INFO, LogCategory.TOKEN, message, context);
  }

  /**
   * Log verification attempts (email verification, password reset)
   */
  static verification(message: string, context?: LogContext): void {
    Logger.log(LogLevel.INFO, LogCategory.SECURITY, message, context);
  }

  /**
   * Log security events (failed attempts, suspicious activity)
   */
  static security(message: string, context?: LogContext): void {
    Logger.log(LogLevel.WARN, LogCategory.SECURITY, message, context);
  }

  /**
   * Log JWT session events (token refresh, session validation)
   */
  static session(message: string, context?: LogContext): void {
    Logger.log(LogLevel.INFO, LogCategory.SESSION, message, context);
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
    Logger.log(LogLevel.ERROR, LogCategory.SESSION, message, errorContext);
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
    Logger.log(LogLevel.ERROR, category, message, errorContext);
  }

  /**
   * Log debug information (only in development)
   */
  static debug(category: LogCategory, message: string, context?: LogContext): void {
    Logger.log(LogLevel.DEBUG, category, message, context);
  }
}
