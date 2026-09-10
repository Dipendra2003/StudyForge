/**
 * JWT Service
 * Handles JWT token generation and validation
 */

import jwt from 'jsonwebtoken';
import { Logger, LogCategory } from '../utils/logger';
import { storage } from '../storage';
import { db } from '../db';
import { refreshTokens } from '../../shared/schema';
import { eq, gt, and, count } from 'drizzle-orm';

export interface JWTPayload {
  userId: number;
  role: string;
  username?: string;
  email?: string;
  emailVerified?: boolean;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private readonly JWT_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

  constructor() {
    // Get JWT secret from environment
    this.JWT_SECRET = process.env.JWT_SECRET || '';

    // Validate JWT secret
    if (!this.JWT_SECRET) {
      Logger.error(
        LogCategory.SECURITY,
        'JWT_SECRET not configured',
        new Error('Missing JWT_SECRET environment variable')
      );
      throw new Error('JWT_SECRET must be configured');
    }

    if (this.JWT_SECRET.length < 32) {
      Logger.error(
        LogCategory.SECURITY,
        'JWT_SECRET too short',
        new Error('JWT_SECRET must be at least 32 characters')
      );
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    Logger.debug(LogCategory.SECURITY, 'JWT Service initialized');
  }

  /**
   * Generate access token with 15-minute expiry
   * Contains userId and role in JWT payload
   * Uses HS256 algorithm with JWT_SECRET from environment
   * Requirements: 3.4, 4.6
   */
  generateAccessToken(userId: number, role: string): string {
    try {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId,
        role
      };

      const token = jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
        algorithm: 'HS256'
      });

      Logger.debug(LogCategory.SECURITY, 'Access token generated', {
        userId,
        role,
        expiresIn: this.ACCESS_TOKEN_EXPIRY
      });

      return token;
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to generate access token', error as Error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Verify access token and decode JWT
   * Handles expired tokens and invalid signatures
   * Returns null for invalid tokens
   * Requirements: 4.1, 4.7
   */
  verifyAccessToken(token: string): { userId: number; role: string } | null {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256']
      }) as JWTPayload;


      return {
        userId: payload.userId,
        role: payload.role
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        Logger.debug(LogCategory.SECURITY, 'Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        Logger.security('Invalid access token', { 
          error: (error as Error).message 
        });
      } else {
        Logger.error(LogCategory.SECURITY, 'Access token verification failed', error as Error);
      }
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   * Supports "Bearer <token>" format
   * Requirements: 4.1
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    // Check if header starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      Logger.debug(LogCategory.SECURITY, 'Authorization header does not start with Bearer');
      return null;
    }

    // Extract token after "Bearer "
    const token = authHeader.substring(7).trim();

    if (!token) {
      Logger.debug(LogCategory.SECURITY, 'Empty token in Authorization header');
      return null;
    }

    return token;
  }

  /**
   * Generate refresh token with 7-day expiry
   */
  generateRefreshToken(userId: number, role: string): string {
    try {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId,
        role
      };

      const token = jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
        algorithm: 'HS256'
      });

      Logger.debug(LogCategory.SECURITY, 'Refresh token generated', {
        userId,
        role,
        expiresIn: this.REFRESH_TOKEN_EXPIRY
      });

      return token;
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to generate refresh token', error as Error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Generate token pair (access + refresh tokens)
   */
  async generateTokenPair(
    userData: { userId: number; username: string; email: string; emailVerified: boolean; role?: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    try {
      const role = userData.role || (await storage.getUser(userData.userId))?.role || 'user';

      const accessToken = this.generateAccessToken(userData.userId, role);
      const refreshToken = this.generateRefreshToken(userData.userId, role);

      // Store refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await storage.createRefreshToken({
        userId: userData.userId,
        token: refreshToken,
        expiresAt,
        userAgent,
        ipAddress,
      });

      Logger.debug(LogCategory.SECURITY, 'Token pair generated', {
        userId: userData.userId,
        username: userData.username,
      });

      return { accessToken, refreshToken };
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to generate token pair', error as Error);
      throw new Error('Failed to generate token pair');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256']
      }) as JWTPayload;

      // Check if token exists in database and is not revoked
      const storedToken = await storage.getRefreshToken(token);
      
      if (!storedToken) {
        Logger.debug(LogCategory.SECURITY, 'Refresh token not found in database');
        return null;
      }

      if (storedToken.expiresAt < new Date()) {
        Logger.debug(LogCategory.SECURITY, 'Refresh token expired');
        return null;
      }

      Logger.debug(LogCategory.SECURITY, 'Refresh token verified', {
        userId: payload.userId,
        role: payload.role
      });

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        Logger.debug(LogCategory.SECURITY, 'Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        Logger.security('Invalid refresh token', { 
          error: (error as Error).message 
        });
      } else {
        Logger.error(LogCategory.SECURITY, 'Refresh token verification failed', error as Error);
      }
      return null;
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      await storage.deleteRefreshToken(token);
      Logger.debug(LogCategory.SECURITY, 'Refresh token revoked');
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to revoke refresh token', error as Error);
      throw new Error('Failed to revoke refresh token');
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    try {
      await storage.deleteAllUserRefreshTokens(userId);
      Logger.debug(LogCategory.SECURITY, 'All user tokens revoked', { userId });
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to revoke all user tokens', error as Error);
      throw new Error('Failed to revoke all user tokens');
    }
  }

  /**
   * Get active session count for a user
   */
  async getActiveSessionCount(userId: number): Promise<number> {
    try {
      const [{ value }] = await db
        .select({ value: count() })
        .from(refreshTokens)
        .where(and(eq(refreshTokens.userId, userId), gt(refreshTokens.expiresAt, new Date())));
      Logger.debug(LogCategory.SECURITY, 'Active session count requested', { userId, sessions: value });
      return value;
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to get active session count', error as Error);
      return 0;
    }
  }
}

// Lazy-loaded singleton instance
let _jwtServiceInstance: JWTService | null = null;

export const jwtService = {
  get instance(): JWTService {
    if (!_jwtServiceInstance) {
      _jwtServiceInstance = new JWTService();
    }
    return _jwtServiceInstance;
  },
  
  // Proxy methods for convenience
  generateAccessToken(userId: number, role: string): string {
    return this.instance.generateAccessToken(userId, role);
  },
  
  verifyAccessToken(token: string): { userId: number; role: string } | null {
    return this.instance.verifyAccessToken(token);
  },
  
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    return this.instance.extractTokenFromHeader(authHeader);
  },

  generateRefreshToken(userId: number, role: string): string {
    return this.instance.generateRefreshToken(userId, role);
  },

  async generateTokenPair(
    userData: { userId: number; username: string; email: string; emailVerified: boolean; role?: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    return this.instance.generateTokenPair(userData, ipAddress, userAgent);
  },

  async verifyRefreshToken(token: string): Promise<JWTPayload | null> {
    return this.instance.verifyRefreshToken(token);
  },

  async revokeRefreshToken(token: string): Promise<void> {
    return this.instance.revokeRefreshToken(token);
  },

  async revokeAllUserTokens(userId: number): Promise<void> {
    return this.instance.revokeAllUserTokens(userId);
  },

  async getActiveSessionCount(userId: number): Promise<number> {
    return this.instance.getActiveSessionCount(userId);
  }
};
