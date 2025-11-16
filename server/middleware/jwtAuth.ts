/**
 * JWT Authentication Middleware
 * 
 * This middleware handles JWT token validation and automatic token refresh.
 * It extracts tokens from httpOnly cookies, validates them, and attaches
 * user information to the request object. Tokens are properly validated
 * against the database to ensure they haven't been revoked.
 */

import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwtService';
import { storage } from '../storage';
import { Logger, LogCategory } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        email: string;
        emailVerified: boolean;
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 * 
 * Validates JWT tokens from httpOnly cookies and attaches user to request.
 * Automatically refreshes access token if expired but refresh token is valid.
 * Enforces proper token expiration and revocation.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function jwtAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract tokens from httpOnly cookies
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      Logger.debug(LogCategory.AUTH, '[jwtAuth] Token check', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        path: req.path,
      });
    }
    
    // If no tokens present, clear cookies and return 401
    if (!accessToken && !refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }
    
    // Try to verify access token first
    let payload = accessToken ? jwtService.verifyAccessToken(accessToken) : null;
    
    // If access token is valid, use it
    if (payload) {
      req.user = payload;
      return next();
    }
    
    // Access token is invalid/expired, try refresh token
    if (refreshToken) {
      const refreshPayload = await jwtService.verifyRefreshToken(refreshToken);
      
      if (!refreshPayload) {
        // Refresh token is invalid, expired, or revoked
        Logger.security('Refresh token validation failed', {
          action: 'token_refresh',
          reason: 'invalid_or_expired',
          path: req.path,
        });
        
        clearAuthCookies(res);
        return res.status(401).json({ 
          message: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      // Get fresh user data from database
      const user = await storage.getUser(refreshPayload.userId);
      
      if (!user) {
        Logger.security('User not found during token refresh', {
          action: 'token_refresh',
          userId: refreshPayload.userId,
          reason: 'user_not_found',
        });
        
        clearAuthCookies(res);
        return res.status(401).json({ 
          message: 'User not found. Please log in again.',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Check if user account is still active
      if (!user.isActive) {
        Logger.security('Inactive user attempted to refresh token', {
          action: 'token_refresh',
          userId: user.id,
          reason: 'account_inactive',
        });
        
        clearAuthCookies(res);
        return res.status(403).json({ 
          message: 'Account is inactive. Please contact support.',
          code: 'ACCOUNT_INACTIVE'
        });
      }
      
      // Generate new token pair with token rotation
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
        || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      const newTokenPair = await jwtService.generateTokenPair(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified ?? false,
        },
        ipAddress,
        userAgent
      );
      
      // Revoke old refresh token (token rotation for security)
      await jwtService.revokeRefreshToken(refreshToken);
      
      // Set new cookies with secure settings
      res.cookie('accessToken', newTokenPair.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', // Changed to 'strict' for better security
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
      });
      
      res.cookie('refreshToken', newTokenPair.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', // Changed to 'strict' for better security
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
      
      Logger.auth('Token refreshed successfully', {
        action: 'token_refresh',
        userId: user.id,
        username: user.username,
      });
      
      // Verify new access token and attach to request
      payload = jwtService.verifyAccessToken(newTokenPair.accessToken);
      
      if (!payload) {
        Logger.error(LogCategory.SECURITY, 'Failed to verify newly generated access token', new Error('Token verification failed'));
        clearAuthCookies(res);
        return res.status(500).json({ 
          message: 'Authentication error. Please log in again.',
          code: 'TOKEN_GENERATION_ERROR'
        });
      }
      
      req.user = payload;
      return next();
    }
    
    // No valid tokens available
    clearAuthCookies(res);
    return res.status(401).json({ 
      message: 'Invalid or expired session. Please log in again.',
      code: 'INVALID_SESSION'
    });
    
  } catch (error) {
    Logger.error(LogCategory.SECURITY, 'JWT authentication error', error as Error, {
      path: req.path,
    });
    
    clearAuthCookies(res);
    return res.status(401).json({ 
      message: 'Authentication failed. Please log in again.',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Helper function to clear authentication cookies
 */
function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}
