import rateLimit from 'express-rate-limit';
import { Logger, LogCategory } from '../utils/logger';

/**
 * Rate limiter specifically for file uploads
 * More restrictive than general API rate limiting
 */
export const uploadRateLimiter = rateLimit({
  windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX_FILES || '20'), // 20 files per window default
  message: {
    success: false,
    message: 'Too many file uploads. Please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to track by user ID if authenticated, otherwise by IP
  keyGenerator: (req) => {
    const userId = req.user?.id;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    
    return userId ? `user_${userId}` : `ip_${ip}`;
  },
  // Log rate limit violations
  handler: (req, res) => {
    const userId = req.user?.id;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    
    Logger.security('Upload rate limit exceeded', {
      userId,
      ip,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many file uploads. Please try again later.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  // Skip rate limiting for successful requests in development
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && process.env.SKIP_UPLOAD_RATE_LIMIT === 'true';
  },
});

/**
 * Stricter rate limiter for profile picture uploads
 * Prevents abuse of profile picture changes
 */
export const profilePictureRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 profile picture changes per hour
  message: {
    success: false,
    message: 'Too many profile picture changes. Please try again later.',
    code: 'PROFILE_PICTURE_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id;
    return userId ? `profile_${userId}` : `profile_ip_${req.socket.remoteAddress}`;
  },
  handler: (req, res) => {
    Logger.security('Profile picture rate limit exceeded', {
      userId: req.user?.id,
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many profile picture changes. Please try again in an hour.',
      code: 'PROFILE_PICTURE_RATE_LIMIT_EXCEEDED',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});
