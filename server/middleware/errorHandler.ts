import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Custom error class for application errors
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

// Error response interface
interface ErrorResponse {
  message: string;
  errors?: Array<{ field: string; message: string }>;
  stack?: string;
}

// Centralized error handler middleware
export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error with context
  console.error('[API Error]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userId: req.user?.userId,
    error: err.message,
    stack: err.stack
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    const errorResponse: ErrorResponse = {
      message: "Validation error",
      errors: validationError.details.map((detail: any) => ({
        field: detail.path?.join('.') || 'unknown',
        message: detail.message
      }))
    };
    
    return res.status(400).json(errorResponse);
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    const errorResponse: ErrorResponse = {
      message: err.message
    };
    
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }
    
    return res.status(err.statusCode).json(errorResponse);
  }

  // Handle database errors
  if (err.message.includes('Failed to')) {
    const errorResponse: ErrorResponse = {
      message: err.message
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }
    
    return res.status(500).json(errorResponse);
  }

  // Handle generic errors
  const errorResponse: ErrorResponse = {
    message: process.env.NODE_ENV === 'production' 
      ? "Internal server error" 
      : err.message || "Internal server error"
  };
  
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
