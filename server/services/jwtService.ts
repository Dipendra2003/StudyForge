/**
 * JWT Token Service
 * 
 * This service handles JWT token generation, verification, and validation
 * for the authentication system. It provides access and refresh tokens
 * with appropriate expiration times and stores refresh tokens in the database.
 */

import jwt, { type Secret } from 'jsonwebtoken';
import { db } from '../db/index';
import { refreshTokens } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  emailVerified: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private accessTokenSecret: Secret;
  private refreshTokenSecret: Secret;
  private accessTokenExpiry: string = '15m'; // 15 minutes
  private refreshTokenExpiry: string = '7d'; // 7 days (reduced from 30 days for better security)
  
  constructor() {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    
    if (!accessSecret || !refreshSecret || accessSecret.length < 32 || refreshSecret.length < 32) {
      throw new Error('JWT secrets must be defined in environment variables and be at least 32 characters');
    }
    
    this.accessTokenSecret = accessSecret;
    this.refreshTokenSecret = refreshSecret;
  }
  
  /**
   * Generate access and refresh tokens for a user
   * @param payload - User information to encode in the token
   * @param ipAddress - Optional IP address for tracking
   * @param userAgent - Optional user agent for tracking
   * @returns Object containing both access and refresh tokens
   */
  async generateTokenPair(
    payload: JWTPayload, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<TokenPair> {
    // Generate access token with short expiry
    const accessToken = jwt.sign(
      payload,
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry } as jwt.SignOptions
    );
    
    // Generate refresh token with longer expiry
    const refreshToken = jwt.sign(
      { userId: payload.userId, tokenId: `${Date.now()}-${Math.random()}` },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry } as jwt.SignOptions
    );
    
    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    try {
      await db.insert(refreshTokens).values({
        userId: payload.userId,
        token: refreshToken,
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      });
    } catch (error) {
      console.error('Failed to store refresh token:', error);
      // Continue anyway - token will still work but won't be tracked
    }
    
    return { accessToken, refreshToken };
  }
  
  /**
   * Verify and decode access token
   * @param token - The JWT access token to verify
   * @returns Decoded payload if valid, null if invalid or expired
   */
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      // Token is invalid or expired
      return null;
    }
  }
  
  /**
   * Verify and decode refresh token, checking database for revocation
   * @param token - The JWT refresh token to verify
   * @returns Decoded payload with userId if valid, null if invalid, expired, or revoked
   */
  async verifyRefreshToken(token: string): Promise<{ userId: number } | null> {
    try {
      // First verify JWT signature and expiration
      const decoded = jwt.verify(token, this.refreshTokenSecret) as { userId: number };
      
      // Check if token exists in database and is not revoked
      const [storedToken] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.token, token),
            eq(refreshTokens.userId, decoded.userId)
          )
        )
        .limit(1);
      
      // Token must exist, not be revoked, and not be expired
      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        return null;
      }
      
      return decoded;
    } catch (error) {
      // Token is invalid or expired
      return null;
    }
  }
  
  /**
   * Revoke a specific refresh token
   * @param token - The refresh token to revoke
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.token, token));
    } catch (error) {
      console.error('Failed to revoke refresh token:', error);
    }
  }
  
  /**
   * Revoke all refresh tokens for a user (useful for logout from all devices)
   * @param userId - The user ID whose tokens should be revoked
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    try {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, userId),
            eq(refreshTokens.revokedAt, null as any)
          )
        );
    } catch (error) {
      console.error('Failed to revoke user tokens:', error);
    }
  }
  
  /**
   * Clean up expired tokens from the database
   * Should be run periodically (e.g., daily via cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await db
        .delete(refreshTokens)
        .where(lt(refreshTokens.expiresAt, new Date()));
      
      return result.rowsAffected || 0;
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error);
      return 0;
    }
  }
  
  /**
   * Get the number of active sessions for a user
   * @param userId - The user ID
   * @returns Number of active sessions
   */
  async getActiveSessionCount(userId: number): Promise<number> {
    try {
      const tokens = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, userId),
            eq(refreshTokens.revokedAt, null as any)
          )
        );
      
      // Filter out expired tokens
      const now = new Date();
      return tokens.filter((t: any) => t.expiresAt > now).length;
    } catch (error) {
      console.error('Failed to get active session count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const jwtService = new JWTService();
