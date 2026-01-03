/**
 * Authentication Service
 * Handles all authentication-related operations with security best practices
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from '../storage';
import { Logger, LogCategory } from '../utils/logger';
import type { User } from '@shared/schema';

export interface TokenPair {
  token: string;
  expiresAt: Date;
}

export interface VerificationTokens {
  token: string;
  otp: string;
  expiresAt: Date;
}

export class AuthService {
  private readonly SALT_ROUNDS = 12; // Increased from 10 for better security
  private readonly TOKEN_LENGTH = 64; // Bytes for secure random tokens
  private readonly OTP_LENGTH = 6; // 6-digit OTP
  
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.SALT_ROUNDS);
      Logger.debug(LogCategory.SECURITY, 'Password hashed successfully');
      return hash;
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Password hashing failed', error as Error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      Logger.debug(LogCategory.SECURITY, 'Password verification completed', { isValid });
      return isValid;
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Password verification failed', error as Error);
      return false;
    }
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Generate a 6-digit OTP
   */
  generateOTP(): string {
    // Generate cryptographically secure random 6-digit number
    const otp = crypto.randomInt(100000, 999999).toString();
    return otp;
  }

  /**
   * Generate verification tokens (both link token and OTP)
   */
  generateVerificationTokens(expiryHours: number = 24): VerificationTokens {
    const token = this.generateSecureToken();
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    Logger.debug(LogCategory.SECURITY, 'Verification tokens generated', {
      tokenLength: token.length,
      otpLength: otp.length,
      expiresAt: expiresAt.toISOString()
    });

    return { token, otp, expiresAt };
  }

  /**
   * Generate password reset tokens
   */
  generateResetTokens(expiryHours: number = 1): VerificationTokens {
    return this.generateVerificationTokens(expiryHours);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', 'password123', '12345678', 'qwerty', 'abc123',
      'password1', '123456789', 'letmein', 'welcome', 'admin'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): { valid: boolean; error?: string } {
    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    const domain = email.toLowerCase().split('@')[1];

    // Block disposable email domains
    const disposableDomains = [
      'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
      'throwaway.email', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
      'yopmail.com', 'maildrop.cc', 'test.com', 'localhost'
    ];

    if (disposableDomains.includes(domain)) {
      return {
        valid: false,
        error: 'Disposable email addresses are not allowed. Please use a permanent email address'
      };
    }

    // Block test/fake email patterns
    const fakePatterns = [
      /^test@/i, /^fake@/i, /^dummy@/i, /^noreply@/i,
      /^test\d+@/i, /^fake\d+@/i, /^user@test\./i
    ];

    for (const pattern of fakePatterns) {
      if (pattern.test(email.toLowerCase())) {
        return {
          valid: false,
          error: 'Test or fake email addresses are not allowed'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check if token has expired
   */
  isTokenExpired(expiryDate: Date | null): boolean {
    if (!expiryDate) return true;
    return new Date() > expiryDate;
  }

  /**
   * Sanitize user data for response (remove sensitive fields)
   */
  sanitizeUser(user: User): Partial<User> {
    const {
      password,
      verificationToken,
      verificationOtp,
      verificationTokenExpiry,
      resetToken,
      resetOtp,
      resetTokenExpiry,
      ...sanitizedUser
    } = user;

    return sanitizedUser;
  }

  /**
   * Generate a session token (for cookie-based sessions)
   */
  generateSessionToken(): string {
    return this.generateSecureToken();
  }

  /**
   * Validate username
   */
  validateUsername(username: string): { valid: boolean; error?: string } {
    if (username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters long' };
    }

    if (username.length > 30) {
      return { valid: false, error: 'Username must not exceed 30 characters' };
    }

    // Only allow alphanumeric characters, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return {
        valid: false,
        error: 'Username can only contain letters, numbers, underscores, and hyphens'
      };
    }

    // Username cannot start with a number
    if (/^\d/.test(username)) {
      return { valid: false, error: 'Username cannot start with a number' };
    }

    return { valid: true };
  }

  /**
   * Rate limiting check helper
   * Returns true if action should be allowed
   */
  checkRateLimit(
    lastAttempt: Date | null,
    minIntervalSeconds: number
  ): { allowed: boolean; waitTime?: number } {
    if (!lastAttempt) {
      return { allowed: true };
    }

    const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
    const minInterval = minIntervalSeconds * 1000;

    if (timeSinceLastAttempt < minInterval) {
      const waitTime = Math.ceil((minInterval - timeSinceLastAttempt) / 1000);
      return { allowed: false, waitTime };
    }

    return { allowed: true };
  }
}

// Export singleton instance
export const authService = new AuthService();
