import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { AIError } from "../utils/ai-errors";

// Base custom error class for application errors
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * ValidationError for input validation failures
 * Requirements: 10.11
 */
export class ValidationError extends AppError {
  public errors?: Array<{ field: string; message: string }>;

  constructor(message: string, errors?: Array<{ field: string; message: string }>) {
    super(400, message, true);
    this.name = 'ValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * AuthenticationError for authentication failures
 * Requirements: 10.11
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(401, message, true);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * AuthorizationError for permission/authorization issues
 * Requirements: 10.11
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message, true);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * RateLimitError for rate limit violations
 * Requirements: 10.11
 */
export class RateLimitError extends AppError {
  public retryAfter?: number; // seconds until next attempt allowed

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(429, message, true);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// Error response interface
interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  retryAfter?: number;
  stack?: string;
  code?: string;
  retryable?: boolean;
}

/**
 * Centralized error handler middleware
 * Catches all errors, logs them with appropriate context, and returns user-friendly messages
 * Requirements: 8.7, 10.11
 */
export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Import Logger dynamically to avoid circular dependencies
  const { Logger, LogCategory } = require('../utils/logger');

  // Determine if this is an operational error (expected) or programming error (unexpected)
  const isOperational = err instanceof AppError && err.isOperational;

  // Log error with appropriate context
  // Never expose sensitive information in logs
  const logContext = {
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    errorName: err.name,
    errorMessage: err.message,
    isOperational,
  };

  // Log with appropriate severity
  if (isOperational) {
    Logger.debug(LogCategory.SYSTEM, 'Operational error occurred', logContext);
  } else {
    Logger.error(LogCategory.SYSTEM, 'Unexpected error occurred', err, logContext);
  }

  // Handle AIError with specific error codes and user-friendly messages
  if (err instanceof AIError) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: err.userMessage,
      code: err.code,
      retryable: err.retryable,
    };

    // Log the original error for debugging
    if (err.originalError) {
      Logger.error(LogCategory.AI, 'AI Error details', err.originalError, {
        code: err.code,
        retryable: err.retryable,
        ...logContext,
      });
    }

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }

    // Return 503 for retryable errors, 500 for non-retryable
    const statusCode = err.retryable ? 503 : 500;
    return res.status(statusCode).json(errorResponse);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    const errorResponse: ErrorResponse = {
      success: false,
      message: "Validation error",
      errors: validationError.details.map((detail: any) => ({
        field: detail.path?.join('.') || 'unknown',
        message: detail.message
      }))
    };
    
    return res.status(400).json(errorResponse);
  }

  // Handle RateLimitError with retry-after header
  if (err instanceof RateLimitError) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: err.message,
    };

    if (err.retryAfter) {
      errorResponse.retryAfter = err.retryAfter;
      res.setHeader('Retry-After', err.retryAfter.toString());
    }

    return res.status(err.statusCode).json(errorResponse);
  }

  // Handle ValidationError with field-level errors
  if (err instanceof ValidationError) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: err.message,
      errors: err.errors,
    };

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }

    return res.status(err.statusCode).json(errorResponse);
  }

  // Handle AuthenticationError
  if (err instanceof AuthenticationError) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: err.message,
    };

    return res.status(err.statusCode).json(errorResponse);
  }

  // Handle AuthorizationError
  if (err instanceof AuthorizationError) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: err.message,
    };

    return res.status(err.statusCode).json(errorResponse);
  }

  // Handle other custom AppError instances
  if (err instanceof AppError) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: err.message,
    };
    
    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }
    
    return res.status(err.statusCode).json(errorResponse);
  }

  // Handle database errors (sanitize message to avoid exposing internal details)
  if (err.message.includes('Failed to') || err.message.includes('database')) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'A database error occurred'
        : err.message,
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }
    
    return res.status(500).json(errorResponse);
  }

  // Handle all other unexpected errors
  // Never expose sensitive information or internal details in production
  const errorResponse: ErrorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? "An unexpected error occurred" 
      : err.message || "An unexpected error occurred"
  };
  
  // Include stack trace only in development for debugging
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  return res.status(500).json(errorResponse);
}

// Async handler wrapper to catch errors in async route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Helper function to handle API errors (for use in route handlers)
export function handleApiError(error: unknown, res: Response) {
  // Handle AIError with specific error codes
  if (error instanceof AIError) {
    const statusCode = error.retryable ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.userMessage,
      code: error.code,
      retryable: error.retryable,
    });
  }

  if (error instanceof ZodError) {
    const validationError = fromZodError(error);
    return res.status(400).json({ 
      message: "Validation error", 
      errors: validationError.details.map((detail: any) => ({
        field: detail.path?.join('.') || 'unknown',
        message: detail.message
      }))
    });
  }
  
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ 
      message: error.message 
    });
  }
  
  // Log the error
  console.error('[API Error]', {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  
  // Return generic error for unknown errors
  return res.status(500).json({ 
    message: process.env.NODE_ENV === 'production'
      ? "Internal server error"
      : error instanceof Error ? error.message : "Internal server error"
  });
}
