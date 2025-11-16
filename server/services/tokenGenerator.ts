import crypto from 'crypto';
import { Logger } from '../utils/logger';

/**
 * TokenGenerator provides cryptographically secure token and OTP generation
 * for authentication flows including email verification and password reset.
 */
export class TokenGenerator {
  /**
   * Generate a cryptographically secure random token for link-based authentication
   * @param bytes - Number of random bytes to generate (default: 32)
   * @returns Hex-encoded token string (64 characters for 32 bytes)
   */
  static generateToken(bytes: number = 32): string {
    const token = crypto.randomBytes(bytes).toString('hex');
    
    Logger.tokenGenerated('Verification/reset token generated', {
      action: 'generate_token',
      tokenLength: token.length,
      bytes,
    });
    
    return token;
  }
  
  /**
   * Generate a cryptographically secure 6-digit OTP code
   * @returns 6-digit numeric string (e.g., "012345")
   */
  static generateOTP(): string {
    // Generate a random number between 0 and 999999
    const otp = crypto.randomInt(0, 1000000);
    // Pad with leading zeros to ensure 6 digits
    const otpString = otp.toString().padStart(6, '0');
    
    Logger.tokenGenerated('OTP code generated', {
      action: 'generate_otp',
      otpLength: 6,
    });
    
    return otpString;
  }
  
  /**
   * Generate token expiry timestamp
   * @param hours - Hours until expiration
   * @returns Date object representing the expiry time
   */
  static generateExpiry(hours: number): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
}
