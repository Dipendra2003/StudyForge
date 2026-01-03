/**
 * Authentication Middleware
 * Handles JWT validation and user authentication for protected routes
 * Requirements: 4.1, 4.2, 4.6, 3.10, 8.5, 8.10
 */

import type { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwt.service';
import { storage } from '../storage';
import { Logger, LogCategory } from '../utils/logger';
import rateLimit from 'express-rate-limit';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Require authentication middleware
 * Validates JWT token and attaches user info to request
 * Returns 401 for invalid/missing tokens
 * Requirements: 4.1, 4.2
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract JWT from cookie or Authorization header (fallback)
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      token = jwtService.extractTokenFromHeader(authHeader);
    }

    if (!token) {
      Logger.security('Authentication failed - no token provided', {
        path: req.path,
      });
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NO_TOKEN',
      });
      return;
    }

    // Validate token using JWTService
    const payload = jwtService.verifyAccessToken(token);

    if (!payload) {
      Logger.security('Authentication failed - invalid token', {
        path: req.path,
      });
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Get user from database to ensure they still exist and are active
    const user = await storage.getUser(payload.userId);

    if (!user) {
      Logger.security('Authentication failed - user not found', {
        userId: payload.userId,
        path: req.path,
      });
      res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    if (!user.isActive) {
      Logger.security('Authentication failed - user inactive', {
        userId: user.id,
        username: user.username,
        path: req.path,
      });
      res.status(401).json({
        success: false,
        message: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE',
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
    };

    Logger.debug(LogCategory.SECURITY, 'Authentication successful', {
      userId: user.id,
      username: user.username,
      path: req.path,
    });

    next();
  } catch (error) {
    Logger.error(LogCategory.SECURITY, 'Authentication error', error as Error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Optional authentication middleware
 * Similar to requireAuth but doesn't fail if token is missing
 * Attaches user info if valid token present
 * Requirements: 4.1
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract JWT from cookie or Authorization header (fallback)
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      token = jwtService.extractTokenFromHeader(authHeader);
    }

    // If no token, just continue without user
    if (!token) {
      Logger.debug(LogCategory.SECURITY, 'Optional auth - no token provided', {
        path: req.path,
      });
      next();
      return;
    }

    // Validate token using JWTService
    const payload = jwtService.verifyAccessToken(token);

    // If invalid token, just continue without user
    if (!payload) {
      Logger.debug(LogCategory.SECURITY, 'Optional auth - invalid token', {
        path: req.path,
      });
      next();
      return;
    }

    // Get user from database
    const user = await storage.getUser(payload.userId);

    // If user exists and is active, attach to request
    if (user && user.isActive) {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
      };

      Logger.debug(LogCategory.SECURITY, 'Optional auth - user authenticated', {
        userId: user.id,
        username: user.username,
        path: req.path,
      });
    }

    next();
  } catch (error) {
    // Log error but don't fail the request
    Logger.error(LogCategory.SECURITY, 'Optional auth error', error as Error);
    next();
  }
}

/**
 * Require specific role middleware
 * Checks req.user.role against required role
 * Returns 403 if insufficient permissions
 * Requirements: 4.6
 */
export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User must be authenticated first
      if (!req.user) {
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
 * Rate limiting middleware for authentication endpoints
 * Implements rate limiting to prevent brute force attacks
 * Configure limits: 5 requests per 15 minutes for login
 * Returns 429 with retry-after header
 * Requirements: 3.10, 8.5, 8.10
 */
export const rateLimitAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    Logger.security('Rate limit exceeded', {
      ipAddress: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
  // Skip successful requests (only count failed attempts)
  skip: (req: Request, res: Response) => {
    // Skip if response is successful (2xx status)
    return res.statusCode >= 200 && res.statusCode < 300;
  },
});

/**
 * Stricter rate limiting for password reset and verification endpoints
 * 3 requests per hour to prevent abuse
 * Requirements: 3.10, 8.5
 */
export const rateLimitPasswordReset = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    Logger.security('Password reset rate limit exceeded', {
      ipAddress: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Rate limiting for registration endpoint
 * 3 requests per hour per IP to prevent spam
 * Requirements: 8.5
 */
export const rateLimitRegistration = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    Logger.security('Registration rate limit exceeded', {
      ipAddress: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Too many registration attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Rate limiting for email verification endpoints
 * 10 requests per 15 minutes per IP to prevent abuse
 * Requirements: 2.6, 8.5
 */
export const rateLimitVerification = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    Logger.security('Verification rate limit exceeded', {
      ipAddress: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Too many verification attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});
