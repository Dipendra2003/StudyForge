import type { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

/**
 * In-memory store for tracking OTP verification attempts
 * Structure: Map<IP_Address, { attempts: number, resetTime: Date }>
 */
interface RateLimitEntry {
  attempts: number;
  resetTime: Date;
}

class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMinutes: number = 15) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMinutes * 60 * 1000; // Convert minutes to milliseconds
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if the IP address has exceeded the rate limit
   * @param ip - IP address to check
   * @returns true if rate limit exceeded, false otherwise
   */
  isRateLimited(ip: string): boolean {
    const entry = this.store.get(ip);
    
    if (!entry) {
      return false;
    }

    // Check if the window has expired
    if (new Date() > entry.resetTime) {
      this.store.delete(ip);
      return false;
    }

    return entry.attempts >= this.maxAttempts;
  }

  /**
   * Increment the attempt count for an IP address
   * @param ip - IP address to increment
   */
  incrementAttempts(ip: string): void {
    const entry = this.store.get(ip);
    const now = new Date();

    if (!entry) {
      // First attempt - create new entry
      this.store.set(ip, {
        attempts: 1,
        resetTime: new Date(now.getTime() + this.windowMs),
      });
    } else {
      // Check if window has expired
      if (now > entry.resetTime) {
        // Reset the counter
        this.store.set(ip, {
          attempts: 1,
          resetTime: new Date(now.getTime() + this.windowMs),
        });
      } else {
        // Increment attempts
        entry.attempts += 1;
      }
    }
  }

  /**
   * Get the time remaining until the rate limit resets
   * @param ip - IP address to check
   * @returns seconds until reset, or 0 if not rate limited
   */
  getResetTime(ip: string): number {
    const entry = this.store.get(ip);
    
    if (!entry) {
      return 0;
    }

    const now = new Date();
    if (now > entry.resetTime) {
      return 0;
    }

    return Math.ceil((entry.resetTime.getTime() - now.getTime()) / 1000);
  }

  /**
   * Get the current attempt count for an IP address
   * @param ip - IP address to check
   * @returns current attempt count
   */
  getAttempts(ip: string): number {
    const entry = this.store.get(ip);
    
    if (!entry) {
      return 0;
    }

    const now = new Date();
    if (now > entry.resetTime) {
      return 0;
    }

    return entry.attempts;
  }

  /**
   * Clean up expired entries from the store
   */
  private cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;

    // Convert to array to avoid iterator issues
    const entries = Array.from(this.store.entries());
    for (const [ip, entry] of entries) {
      if (now > entry.resetTime) {
        this.store.delete(ip);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      Logger.security('Rate limiter cleanup completed', {
        cleanedEntries: cleanedCount,
        remainingEntries: this.store.size,
      });
    }
  }

  /**
   * Get the current size of the store (for monitoring)
   */
  getStoreSize(): number {
    return this.store.size;
  }

  /**
   * Reset the rate limiter for a specific IP or all IPs (for testing)
   * @param ip - Optional IP address to reset. If not provided, resets all.
   */
  reset(ip?: string): void {
    if (ip) {
      this.store.delete(ip);
    } else {
      this.store.clear();
    }
  }
}

// Create a singleton instance for OTP rate limiting
// Maximum 5 attempts per 15 minutes per IP address
const otpRateLimitStore = new RateLimitStore(5, 15);

// Create a singleton instance for email sending rate limiting
// Maximum 3 email sends per 60 minutes per IP address (stricter than OTP)
const emailRateLimitStore = new RateLimitStore(3, 60);

/**
 * Middleware to rate limit email sending (registration, password reset, resend verification)
 * Limits to 3 email sends per 60 minutes per IP address
 * Returns 429 status with retry-after header when limit exceeded
 */
export function emailRateLimiter(req: Request, res: Response, next: NextFunction): void {
  // Get IP address from request
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
    || req.socket.remoteAddress 
    || 'unknown';

  // Check if rate limited
  if (emailRateLimitStore.isRateLimited(ip)) {
    const retryAfter = emailRateLimitStore.getResetTime(ip);
    const attempts = emailRateLimitStore.getAttempts(ip);

    Logger.security('Email rate limit exceeded', {
      action: 'email_rate_limit',
      ip,
      attempts,
      retryAfter,
      path: req.path,
    });

    res.set('Retry-After', retryAfter.toString());
    res.status(429).json({
      message: 'Too many email requests. Please try again later.',
      retryAfter,
    });
    return;
  }

  // Increment attempt count
  emailRateLimitStore.incrementAttempts(ip);

  const currentAttempts = emailRateLimitStore.getAttempts(ip);

  Logger.security('Email request tracked', {
    action: 'email_rate_limit_check',
    ip,
    attempts: currentAttempts,
    maxAttempts: 3,
    path: req.path,
  });

  next();
}

/**
 * Middleware to rate limit OTP verification attempts
 * Limits to 5 attempts per 15 minutes per IP address
 * Returns 429 status with retry-after header when limit exceeded
 */
export function otpRateLimiter(req: Request, res: Response, next: NextFunction): void {
  // Get IP address from request
  // Check X-Forwarded-For header first (for proxies), then fall back to socket address
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
    || req.socket.remoteAddress 
    || 'unknown';

  // Check if rate limited
  if (otpRateLimitStore.isRateLimited(ip)) {
    const retryAfter = otpRateLimitStore.getResetTime(ip);
    const attempts = otpRateLimitStore.getAttempts(ip);

    Logger.security('OTP rate limit exceeded', {
      action: 'rate_limit',
      ip,
      attempts,
      retryAfter,
      path: req.path,
    });

    res.set('Retry-After', retryAfter.toString());
    res.status(429).json({
      message: 'Too many verification attempts. Please try again later.',
      retryAfter,
    });
    return;
  }

  // Increment attempt count
  otpRateLimitStore.incrementAttempts(ip);

  const currentAttempts = otpRateLimitStore.getAttempts(ip);

  Logger.security('OTP verification attempt tracked', {
    action: 'rate_limit_check',
    ip,
    attempts: currentAttempts,
    maxAttempts: 5,
    path: req.path,
  });

  next();
}

// Export the stores for testing purposes
export { otpRateLimitStore, emailRateLimitStore };
