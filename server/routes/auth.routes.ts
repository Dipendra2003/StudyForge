/**
 * Authentication Routes
 * Handles all authentication-related endpoints
 * Requirements: 10.1-10.11
 */

import type { Request, Response } from 'express';
import { registerSchema, verifyEmailSchema, resendVerificationSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@shared/schema';
import { authService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { jwtService } from '../services/jwt.service';
import { storage } from '../storage';
import { Logger, LogCategory } from '../utils/logger';
import { REFRESH_TOKEN_COOKIE_OPTIONS, sanitizeEmail, sanitizeUsername, sanitizeString } from '../config/security';

// Initialize email service
const emailService = new EmailService();

/**
 * POST /api/auth/register
 * Register a new user account
 * Requirements: 1.1-1.8, 10.1
 */
export async function registerHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body using Zod schema
    const validationResult = registerSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      Logger.security('Registration failed - validation errors', {
        action: 'register',
        errors,
      });
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Sanitize inputs to prevent XSS attacks
    const username = sanitizeUsername(validationResult.data.username);
    const email = sanitizeEmail(validationResult.data.email);
    const password = validationResult.data.password; // Don't sanitize password - it will be hashed
    const fullName = sanitizeString(validationResult.data.fullName || '');

    // Validate username format
    const usernameValidation = authService.validateUsername(username);
    if (!usernameValidation.valid) {
      Logger.security('Registration failed - invalid username', {
        action: 'register',
        username,
        error: usernameValidation.error,
      });
      res.status(400).json({
        success: false,
        message: usernameValidation.error,
        errors: [usernameValidation.error!],
      });
      return;
    }

    // Validate email format and check for disposable domains
    const emailValidation = authService.validateEmail(email);
    if (!emailValidation.valid) {
      Logger.security('Registration failed - invalid email', {
        action: 'register',
        email,
        error: emailValidation.error,
      });
      res.status(400).json({
        success: false,
        message: emailValidation.error,
        errors: [emailValidation.error!],
      });
      return;
    }

    // Validate password strength
    const passwordValidation = authService.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      Logger.security('Registration failed - weak password', {
        action: 'register',
        username,
        errors: passwordValidation.errors,
      });
      res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
      return;
    }

    // Check for existing username
    const existingUserByUsername = await storage.getUserByUsername(username);
    if (existingUserByUsername) {
      Logger.security('Registration failed - username exists', {
        action: 'register',
        username,
        reason: 'duplicate_username',
      });
      res.status(409).json({
        success: false,
        message: 'Username or email already exists',
        errors: ['Username or email already exists'],
      });
      return;
    }

    // Check for existing email
    const existingUserByEmail = await storage.getUserByEmail(email);
    if (existingUserByEmail) {
      Logger.security('Registration failed - email exists', {
        action: 'register',
        email,
        reason: 'duplicate_email',
      });
      res.status(409).json({
        success: false,
        message: 'Username or email already exists',
        errors: ['Username or email already exists'],
      });
      return;
    }

    // Hash password using AuthService
    const hashedPassword = await authService.hashPassword(password);

    // Generate verification tokens (24-hour expiry)
    const verificationTokens = authService.generateVerificationTokens(24);

    // Get IP address and user agent for security logging
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Create user in database
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      fullName,
      emailVerified: false,
      verificationToken: verificationTokens.token,
      verificationOtp: verificationTokens.otp,
      verificationTokenExpiry: verificationTokens.expiresAt,
    } as any);

    Logger.auth('User account created successfully', {
      action: 'register',
      userId: user.id,
      username: user.username,
      email: user.email,
      emailVerified: false,
    });

    // Log registration attempt to security audit log
    await storage.createSecurityAuditLog({
      userId: user.id,
      action: 'register',
      status: 'success',
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      details: {
        username: user.username,
        email: user.email,
      },
    });

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        user.id,
        user.email,
        user.username,
        verificationTokens.token,
        verificationTokens.otp
      );

      Logger.auth('Verification email sent successfully', {
        action: 'register',
        userId: user.id,
        email: user.email,
      });
    } catch (emailError) {
      // Log email error but don't fail registration
      Logger.error(LogCategory.EMAIL, 'Failed to send verification email', emailError as Error);
      
      // Email service already logs the error, so we just continue
      // User can request a new verification email later
    }

    // Return success response with sanitized user data
    const sanitizedUser = authService.sanitizeUser(user);

    Logger.auth('Registration completed successfully', {
      action: 'register',
      userId: user.id,
      username: user.username,
      email: user.email,
      success: true,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: sanitizedUser,
      },
    });
  } catch (error) {
    // Log error with context
    Logger.error(LogCategory.SECURITY, 'Registration error', error as Error);

    // Log failed registration attempt to security audit log
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'register',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          error: (error as Error).message,
          username: req.body?.username,
          email: req.body?.email,
        },
      });
    } catch (logError) {
      // If logging fails, just log to console
      Logger.error(LogCategory.SECURITY, 'Failed to log security audit', logError as Error);
    }

    // Return generic error message
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration. Please try again later.',
      errors: ['Internal server error'],
    });
  }
}

/**
 * POST /api/auth/verify-email
 * Verify user email with token or OTP
 * Requirements: 2.1-2.5, 10.2
 */
export async function verifyEmailHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body using Zod schema
    const validationResult = verifyEmailSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      Logger.security('Email verification failed - validation errors', {
        action: 'verify_email',
        errors,
      });
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    const { token, otp } = validationResult.data;
    const method = token ? 'token' : 'otp';

    // Get IP address and user agent for security logging
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    Logger.verification('Email verification attempt started', {
      action: 'verify_email',
      method,
    });

    // Look up user by token or OTP
    let user;
    if (token) {
      user = await storage.getUserByVerificationToken(token);
    } else if (otp) {
      user = await storage.getUserByVerificationOtp(otp);
    }

    // Validate user exists
    if (!user) {
      Logger.security('Email verification failed - invalid code', {
        action: 'verify_email',
        method,
        reason: 'invalid_code',
      });

      // Log failed verification attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'verify_email',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          method,
          reason: 'invalid_code',
        },
      });

      res.status(400).json({
        success: false,
        message: 'Invalid verification code',
        errors: ['Invalid verification code'],
      });
      return;
    }

    // Check token expiry
    if (authService.isTokenExpired(user.verificationTokenExpiry)) {
      Logger.security('Email verification failed - code expired', {
        action: 'verify_email',
        userId: user.id,
        username: user.username,
        method,
        reason: 'expired_code',
      });

      // Log failed verification attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: user.id,
        action: 'verify_email',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          method,
          reason: 'expired_code',
        },
      });

      res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.',
        errors: ['Verification code has expired'],
      });
      return;
    }

    // Check if email is already verified
    if (user.emailVerified) {
      Logger.verification('Email verification - already verified', {
        action: 'verify_email',
        userId: user.id,
        username: user.username,
        method,
        alreadyVerified: true,
      });

      res.status(200).json({
        success: true,
        message: 'Email is already verified',
        data: {
          alreadyVerified: true,
        },
      });
      return;
    }

    // Mark user as verified and clear verification tokens
    await storage.updateUser(user.id, {
      emailVerified: true,
      verificationToken: null,
      verificationOtp: null,
      verificationTokenExpiry: null,
    });

    Logger.verification('Email verified successfully', {
      action: 'verify_email',
      userId: user.id,
      username: user.username,
      email: user.email,
      method,
      success: true,
    });

    // Log successful verification to security audit log
    await storage.createSecurityAuditLog({
      userId: user.id,
      action: 'verify_email',
      status: 'success',
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      details: {
        method,
        email: user.email,
      },
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Email has been verified successfully. You can now log in.',
      data: {
        verified: true,
      },
    });
  } catch (error) {
    // Log error with context
    Logger.error(LogCategory.SECURITY, 'Email verification error', error as Error);

    // Log failed verification attempt to security audit log
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'verify_email',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          error: (error as Error).message,
        },
      });
    } catch (logError) {
      // If logging fails, just log to console
      Logger.error(LogCategory.SECURITY, 'Failed to log security audit', logError as Error);
    }

    // Return generic error message
    res.status(500).json({
      success: false,
      message: 'An error occurred during email verification. Please try again later.',
      errors: ['Internal server error'],
    });
  }
}

/**
 * POST /api/auth/resend-verification
 * Resend verification email to user
 * Requirements: 2.6, 2.7, 10.3
 */
export async function resendVerificationHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body using Zod schema
    const validationResult = resendVerificationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      Logger.security('Resend verification failed - validation errors', {
        action: 'resend_verification',
        errors,
      });
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Sanitize email input
    const email = sanitizeEmail(validationResult.data.email);

    // Get IP address and user agent for security logging
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    Logger.verification('Resend verification email attempt', {
      action: 'resend_verification',
      email,
    });

    // Find user by email
    const user = await storage.getUserByEmail(email);

    // SECURITY: Return generic message to prevent email enumeration
    if (!user) {
      Logger.security('Resend verification failed - user not found', {
        action: 'resend_verification',
        email,
        reason: 'user_not_found',
      });

      // Log resend request to security audit log
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'resend_verification',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          email,
          reason: 'user_not_found',
        },
      });

      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a verification email has been sent.',
        data: {},
      });
      return;
    }

    // Check if email is already verified
    if (user.emailVerified) {
      Logger.verification('Resend verification failed - email already verified', {
        action: 'resend_verification',
        userId: user.id,
        username: user.username,
        email: user.email,
        reason: 'already_verified',
      });

      res.status(400).json({
        success: false,
        message: 'Email is already verified',
        errors: ['Email is already verified'],
      });
      return;
    }

    // Check rate limit (60 seconds between requests)
    // We'll use the verificationTokenExpiry as a proxy for last request time
    // In a production system, you'd want a separate rate limiting mechanism
    const rateLimit = authService.checkRateLimit(user.verificationTokenExpiry, 60);
    if (!rateLimit.allowed) {
      Logger.security('Resend verification failed - rate limit exceeded', {
        action: 'resend_verification',
        userId: user.id,
        username: user.username,
        email: user.email,
        waitTime: rateLimit.waitTime,
      });

      res.status(429).json({
        success: false,
        message: `Please wait ${rateLimit.waitTime} seconds before requesting another verification email`,
        errors: [`Rate limit exceeded. Please wait ${rateLimit.waitTime} seconds.`],
      });
      return;
    }

    // Invalidate old verification tokens and generate new ones
    const verificationTokens = authService.generateVerificationTokens(24);

    // Update user with new verification credentials
    await storage.updateUser(user.id, {
      verificationToken: verificationTokens.token,
      verificationOtp: verificationTokens.otp,
      verificationTokenExpiry: verificationTokens.expiresAt,
    });

    Logger.verification('New verification credentials generated', {
      action: 'resend_verification',
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    // Send new verification email
    try {
      await emailService.sendVerificationEmail(
        user.id,
        user.email,
        user.username,
        verificationTokens.token,
        verificationTokens.otp
      );

      Logger.verification('Verification email sent successfully', {
        action: 'resend_verification',
        userId: user.id,
        email: user.email,
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      Logger.error(LogCategory.EMAIL, 'Failed to send verification email', emailError as Error);
      
      // Email service already logs the error
      // We'll still return success to prevent email enumeration
    }

    // Log resend request to security audit log
    await storage.createSecurityAuditLog({
      userId: user.id,
      action: 'resend_verification',
      status: 'success',
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      details: {
        email: user.email,
      },
    });

    Logger.verification('Resend verification completed successfully', {
      action: 'resend_verification',
      userId: user.id,
      username: user.username,
      email: user.email,
      success: true,
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Verification email has been sent. Please check your inbox.',
      data: {},
    });
  } catch (error) {
    // Log error with context
    Logger.error(LogCategory.SECURITY, 'Resend verification error', error as Error);

    // Log failed resend attempt to security audit log
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'resend_verification',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          error: (error as Error).message,
          email: req.body?.email,
        },
      });
    } catch (logError) {
      // If logging fails, just log to console
      Logger.error(LogCategory.SECURITY, 'Failed to log security audit', logError as Error);
    }

    // Return generic error message
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending verification email. Please try again later.',
      errors: ['Internal server error'],
    });
  }
}

/**
 * POST /api/auth/login
 * User login with credentials
 * Requirements: 3.1-3.8, 10.4
 */
export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body using Zod schema
    const validationResult = loginSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      Logger.security('Login failed - validation errors', {
        action: 'login',
        errors,
      });
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Sanitize identifier (could be username or email)
    const identifier = validationResult.data.identifier.trim();
    const password = validationResult.data.password; // Don't sanitize password

    // Get IP address and user agent for security logging
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    Logger.auth('Login attempt started', {
      action: 'login',
      identifier,
    });

    // Find user by username or email
    let user = await storage.getUserByUsername(identifier);
    if (!user) {
      user = await storage.getUserByEmail(identifier);
    }

    // Generic error message to prevent user enumeration
    if (!user) {
      Logger.security('Login failed - user not found', {
        action: 'login',
        identifier,
        reason: 'user_not_found',
      });

      // Log failed login attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'login',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          identifier,
          reason: 'invalid_credentials',
        },
      });

      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errors: ['Invalid credentials'],
      });
      return;
    }

    // Check account lockout status
    if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
      const lockoutMinutes = Math.ceil((user.accountLockedUntil.getTime() - Date.now()) / (60 * 1000));
      
      Logger.security('Login failed - account locked', {
        action: 'login',
        userId: user.id,
        username: user.username,
        reason: 'account_locked',
        lockoutMinutes,
      });

      // Log failed login attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: user.id,
        action: 'login',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          reason: 'account_locked',
          lockoutMinutes,
        },
      });

      res.status(403).json({
        success: false,
        message: `Account is temporarily locked. Please try again in ${lockoutMinutes} minute(s).`,
        errors: [`Account locked for ${lockoutMinutes} minute(s)`],
      });
      return;
    }

    // Verify password using AuthService
    const isPasswordValid = await authService.verifyPassword(password, user.password);

    if (!isPasswordValid) {
      Logger.security('Login failed - invalid password', {
        action: 'login',
        userId: user.id,
        username: user.username,
        reason: 'invalid_password',
      });

      // Increment failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const now = new Date();
      
      // Lock account after 10 failed attempts for 1 hour
      let accountLockedUntil = user.accountLockedUntil;
      if (failedAttempts >= 10) {
        accountLockedUntil = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        
        Logger.security('Account locked due to failed login attempts', {
          action: 'login',
          userId: user.id,
          username: user.username,
          failedAttempts,
        });
      }

      // Update user with failed login tracking
      await storage.updateUser(user.id, {
        failedLoginAttempts: failedAttempts,
        lastFailedLogin: now,
        accountLockedUntil,
      });

      // Log failed login attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: user.id,
        action: 'login',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          reason: 'invalid_password',
          failedAttempts,
          accountLocked: failedAttempts >= 10,
        },
      });

      // Return appropriate error message
      if (failedAttempts >= 10) {
        res.status(403).json({
          success: false,
          message: 'Account has been locked due to too many failed login attempts. Please try again in 1 hour.',
          errors: ['Account locked'],
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          errors: ['Invalid credentials'],
        });
      }
      return;
    }

    // Check email verification status
    if (!user.emailVerified) {
      Logger.security('Login failed - email not verified', {
        action: 'login',
        userId: user.id,
        username: user.username,
        reason: 'email_not_verified',
      });

      // Log failed login attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: user.id,
        action: 'login',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          reason: 'email_not_verified',
        },
      });

      res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in.',
        errors: ['Email not verified'],
      });
      return;
    }

    // Generate JWT access token (15-minute expiry)
    const accessToken = jwtService.generateAccessToken(user.id, user.role || 'user');

    // Generate refresh token (7-day expiry)
    const refreshTokenValue = authService.generateSecureToken();
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in database
    await storage.createRefreshToken({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: refreshTokenExpiry,
      userAgent: userAgent || undefined,
      ipAddress: ipAddress || undefined,
    });

    // Reset failed login attempts counter on successful login
    const now = new Date();
    await storage.updateUser(user.id, {
      lastLogin: now,
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      accountLockedUntil: null,
    });

    Logger.auth('Login successful', {
      action: 'login',
      userId: user.id,
      username: user.username,
      email: user.email,
      success: true,
    });

    // Log successful login to security audit log
    await storage.createSecurityAuditLog({
      userId: user.id,
      action: 'login',
      status: 'success',
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      details: {
        username: user.username,
        email: user.email,
      },
    });

    // Set HttpOnly cookie with refresh token using centralized security configuration
    res.cookie('refreshToken', refreshTokenValue, REFRESH_TOKEN_COOKIE_OPTIONS);

    // Return access token and sanitized user data
    const sanitizedUser = authService.sanitizeUser(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: sanitizedUser,
      },
    });
  } catch (error) {
    // Log error with context
    Logger.error(LogCategory.SECURITY, 'Login error', error as Error);

    // Log failed login attempt to security audit log
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'login',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          error: (error as Error).message,
          identifier: req.body?.identifier,
        },
      });
    } catch (logError) {
      // If logging fails, just log to console
      Logger.error(LogCategory.SECURITY, 'Failed to log security audit', logError as Error);
    }

    // Return generic error message
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again later.',
      errors: ['Internal server error'],
    });
  }
}

/**
 * POST /api/auth/logout
 * User logout - invalidate refresh token
 * Requirements: 4.5, 10.5
 */
export async function logoutHandler(req: Request, res: Response): Promise<void> {
  try {
    // Get IP address and user agent for security logging
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Extract refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    Logger.auth('Logout attempt', {
      action: 'logout',
      userId: req.user?.id,
      hasRefreshToken: !!refreshToken,
    });

    // If refresh token exists, delete it from database
    if (refreshToken) {
      const deleted = await storage.deleteRefreshToken(refreshToken);
      
      if (deleted) {
        Logger.auth('Refresh token deleted from database', {
          action: 'logout',
          userId: req.user?.id,
        });
      }
    }

    // Clear refresh token cookie using centralized security configuration
    res.clearCookie('refreshToken', REFRESH_TOKEN_COOKIE_OPTIONS);

    Logger.auth('Logout completed successfully', {
      action: 'logout',
      userId: req.user?.id,
      success: true,
    });

    // Log logout event to security audit log
    if (req.user) {
      await storage.createSecurityAuditLog({
        userId: req.user.id,
        action: 'logout',
        status: 'success',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          username: req.user.username,
        },
      });
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: {},
    });
  } catch (error) {
    // Log error with context
    Logger.error(LogCategory.SECURITY, 'Logout error', error as Error);

    // Still clear cookie even if there's an error
    res.clearCookie('refreshToken', REFRESH_TOKEN_COOKIE_OPTIONS);

    // Return success anyway (logout should always succeed from user perspective)
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: {},
    });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * Requirements: 4.2-4.4, 4.8, 10.6
 */
export async function refreshHandler(req: Request, res: Response): Promise<void> {
  try {
    // Get IP address and user agent for security logging
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Extract refresh token from cookie or request body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    Logger.auth('Token refresh attempt', {
      action: 'refresh',
      hasRefreshToken: !!refreshToken,
      source: req.cookies?.refreshToken ? 'cookie' : 'body',
    });

    if (!refreshToken) {
      Logger.security('Token refresh failed - no token provided', {
        action: 'refresh',
        reason: 'no_token',
      });

      res.status(401).json({
        success: false,
        message: 'Refresh token required',
        errors: ['Refresh token required'],
      });
      return;
    }

    // Validate token exists in database
    const storedToken = await storage.getRefreshToken(refreshToken);

    if (!storedToken) {
      Logger.security('Token refresh failed - invalid token', {
        action: 'refresh',
        reason: 'invalid_token',
      });

      // Log failed refresh attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'refresh',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          reason: 'invalid_token',
        },
      });

      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        errors: ['Invalid refresh token'],
      });
      return;
    }

    // Check token expiry
    if (new Date() > storedToken.expiresAt) {
      Logger.security('Token refresh failed - token expired', {
        action: 'refresh',
        userId: storedToken.userId,
        reason: 'expired_token',
      });

      // Delete expired token from database
      await storage.deleteRefreshToken(refreshToken);

      // Log failed refresh attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: storedToken.userId,
        action: 'refresh',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          reason: 'expired_token',
        },
      });

      res.status(401).json({
        success: false,
        message: 'Refresh token has expired. Please log in again.',
        errors: ['Refresh token expired'],
      });
      return;
    }

    // Get user from database
    const user = await storage.getUser(storedToken.userId);

    if (!user) {
      Logger.security('Token refresh failed - user not found', {
        action: 'refresh',
        userId: storedToken.userId,
        reason: 'user_not_found',
      });

      // Delete token for non-existent user
      await storage.deleteRefreshToken(refreshToken);

      // Log failed refresh attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: storedToken.userId,
        action: 'refresh',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          reason: 'user_not_found',
        },
      });

      res.status(401).json({
        success: false,
        message: 'User not found',
        errors: ['User not found'],
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      Logger.security('Token refresh failed - user inactive', {
        action: 'refresh',
        userId: user.id,
        username: user.username,
        reason: 'user_inactive',
      });

      // Delete token for inactive user
      await storage.deleteRefreshToken(refreshToken);

      // Log failed refresh attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: user.id,
        action: 'refresh',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          reason: 'user_inactive',
        },
      });

      res.status(401).json({
        success: false,
        message: 'Account is inactive',
        errors: ['Account is inactive'],
      });
      return;
    }

    // Generate new access token
    const accessToken = jwtService.generateAccessToken(user.id, user.role || 'user');

    Logger.auth('Token refresh successful', {
      action: 'refresh',
      userId: user.id,
      username: user.username,
      success: true,
    });

    // Log successful refresh to security audit log
    await storage.createSecurityAuditLog({
      userId: user.id,
      action: 'refresh',
      status: 'success',
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      details: {
        username: user.username,
      },
    });

    // Return new access token
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    // Log error with context
    Logger.error(LogCategory.SECURITY, 'Token refresh error', error as Error);

    // Log failed refresh attempt to security audit log
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'refresh',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          error: (error as Error).message,
        },
      });
    } catch (logError) {
      // If logging fails, just log to console
      Logger.error(LogCategory.SECURITY, 'Failed to log security audit', logError as Error);
    }

    // Return generic error message
    res.status(500).json({
      success: false,
      message: 'An error occurred during token refresh. Please try again later.',
      errors: ['Internal server error'],
    });
  }
}

/**
 * POST /api/auth/forgot-password
 * Request password reset
 * Requirements: 5.1-5.7, 10.7
 */
export async function forgotPasswordHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body using Zod schema
    const validationResult = forgotPasswordSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      Logger.security('Password reset request failed - validation errors', {
        action: 'forgot_password',
        errors,
      });
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Sanitize email input
    const email = sanitizeEmail(validationResult.data.email);

    // Get IP address and user agent for security logging
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    Logger.verification('Password reset request started', {
      action: 'forgot_password',
      email,
    });

    // Find user by email
    const user = await storage.getUserByEmail(email);

    // SECURITY: Always return success message to prevent email enumeration
    // Even if user doesn't exist, we return the same response
    if (!user) {
      Logger.security('Password reset request - user not found', {
        action: 'forgot_password',
        email,
        reason: 'user_not_found',
      });

      // Log password reset request to security audit log
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'forgot_password',
        status: 'success',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          email,
          reason: 'user_not_found',
        },
      });

      // Return success message to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been sent.',
        data: {},
      });
      return;
    }

    // Check rate limit (60 seconds between requests)
    // Use resetTokenExpiry as a proxy for last request time
    const rateLimit = authService.checkRateLimit(user.resetTokenExpiry, 60);
    if (!rateLimit.allowed) {
      Logger.security('Password reset request failed - rate limit exceeded', {
        action: 'forgot_password',
        userId: user.id,
        username: user.username,
        email: user.email,
        waitTime: rateLimit.waitTime,
      });

      res.status(429).json({
        success: false,
        message: `Please wait ${rateLimit.waitTime} seconds before requesting another password reset`,
        errors: [`Rate limit exceeded. Please wait ${rateLimit.waitTime} seconds.`],
      });
      return;
    }

    // Invalidate all previous reset tokens and generate new ones (1-hour expiry)
    const resetTokens = authService.generateResetTokens(1);

    // Store reset tokens in database
    await storage.updateUser(user.id, {
      resetToken: resetTokens.token,
      resetOtp: resetTokens.otp,
      resetTokenExpiry: resetTokens.expiresAt,
    });

    Logger.verification('Password reset credentials generated', {
      action: 'forgot_password',
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        user.id,
        user.email,
        user.username,
        resetTokens.token,
        resetTokens.otp
      );

      Logger.verification('Password reset email sent successfully', {
        action: 'forgot_password',
        userId: user.id,
        email: user.email,
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      Logger.error(LogCategory.EMAIL, 'Failed to send password reset email', emailError as Error);
      
      // Email service already logs the error
      // We'll still return success to prevent email enumeration
    }

    // Log password reset request to security audit log
    await storage.createSecurityAuditLog({
      userId: user.id,
      action: 'forgot_password',
      status: 'success',
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      details: {
        email: user.email,
      },
    });

    Logger.verification('Password reset request completed successfully', {
      action: 'forgot_password',
      userId: user.id,
      username: user.username,
      email: user.email,
      success: true,
    });

    // Always return success response (even if user doesn't exist)
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.',
      data: {},
    });
  } catch (error) {
    // Log error with context
    Logger.error(LogCategory.SECURITY, 'Password reset request error', error as Error);

    // Log failed password reset request to security audit log
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'forgot_password',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          error: (error as Error).message,
          email: req.body?.email,
        },
      });
    } catch (logError) {
      // If logging fails, just log to console
      Logger.error(LogCategory.SECURITY, 'Failed to log security audit', logError as Error);
    }

    // Return generic error message
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request. Please try again later.',
      errors: ['Internal server error'],
    });
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user information
 * Requirements: 10.9
 */
export async function meHandler(req: Request, res: Response): Promise<void> {
  try {
    // User is already authenticated via requireAuth middleware
    // req.user contains basic user info from JWT
    const userId = req.user?.id;

    if (!userId) {
      Logger.security('Get current user failed - no user in request', {
        action: 'me',
        reason: 'no_user_in_request',
      });

      res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: ['Authentication required'],
      });
      return;
    }

    Logger.auth('Get current user attempt', {
      action: 'me',
      userId,
    });

    // Get full user data from database
    const user = await storage.getUser(userId);

    if (!user) {
      Logger.security('Get current user failed - user not found', {
        action: 'me',
        userId,
        reason: 'user_not_found',
      });

      res.status(404).json({
        success: false,
        message: 'User not found',
        errors: ['User not found'],
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      Logger.security('Get current user failed - user inactive', {
        action: 'me',
        userId,
        reason: 'user_inactive',
      });

      res.status(403).json({
        success: false,
        message: 'Account is inactive',
        errors: ['Account is inactive'],
      });
      return;
    }

    Logger.auth('Get current user successful', {
      action: 'me',
      userId: user.id,
      username: user.username,
      success: true,
    });

    // Return sanitized user data
    const sanitizedUser = authService.sanitizeUser(user);

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: sanitizedUser,
      },
    });
  } catch (error) {
    // Log error with context
    Logger.error(LogCategory.SECURITY, 'Get current user error', error as Error);

    // Return generic error message
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving user information. Please try again later.',
      errors: ['Internal server error'],
    });
  }
}

/**
 * POST /api/auth/reset-password
 * Complete password reset with token/OTP and new password
 * Requirements: 6.1-6.9, 10.8
 */
export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body using Zod schema
    const validationResult = resetPasswordSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      Logger.security('Password reset failed - validation errors', {
        action: 'reset_password',
        errors,
      });
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Extract data (tokens/OTP don't need sanitization, password will be hashed)
    const token = validationResult.data.token;
    const otp = validationResult.data.otp;
    const newPassword = validationResult.data.newPassword;
    const method = token ? 'token' : 'otp';

    // Get IP address and user agent for security logging
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    Logger.verification('Password reset attempt started', {
      action: 'reset_password',
      method,
    });

    // Find user by reset token or OTP
    let user;
    if (token) {
      user = await storage.getUserByResetToken(token);
    } else if (otp) {
      user = await storage.getUserByResetOtp(otp);
    }

    // Validate user exists
    if (!user) {
      Logger.security('Password reset failed - invalid code', {
        action: 'reset_password',
        method,
        reason: 'invalid_code',
      });

      // Log failed reset attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'reset_password',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          method,
          reason: 'invalid_code',
        },
      });

      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code',
        errors: ['Invalid or expired reset code'],
      });
      return;
    }

    // Check token expiry
    if (authService.isTokenExpired(user.resetTokenExpiry)) {
      Logger.security('Password reset failed - code expired', {
        action: 'reset_password',
        userId: user.id,
        username: user.username,
        method,
        reason: 'expired_code',
      });

      // Log failed reset attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: user.id,
        action: 'reset_password',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          method,
          reason: 'expired_code',
        },
      });

      res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one.',
        errors: ['Reset code has expired'],
      });
      return;
    }

    // Validate new password strength
    const passwordValidation = authService.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      Logger.security('Password reset failed - weak password', {
        action: 'reset_password',
        userId: user.id,
        username: user.username,
        errors: passwordValidation.errors,
      });

      // Log failed reset attempt to security audit log
      await storage.createSecurityAuditLog({
        userId: user.id,
        action: 'reset_password',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          method,
          reason: 'weak_password',
          errors: passwordValidation.errors,
        },
      });

      res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
      return;
    }

    // Hash new password
    const hashedPassword = await authService.hashPassword(newPassword);

    // Update user password in database and clear reset tokens
    await storage.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetOtp: null,
      resetTokenExpiry: null,
    });

    Logger.verification('Password updated successfully', {
      action: 'reset_password',
      userId: user.id,
      username: user.username,
      method,
    });

    // Invalidate all refresh tokens for user (force re-login on all devices)
    const tokensInvalidated = await storage.deleteAllUserRefreshTokens(user.id);

    Logger.verification('All refresh tokens invalidated', {
      action: 'reset_password',
      userId: user.id,
      username: user.username,
      tokensInvalidated,
    });

    // Send password changed confirmation email
    try {
      await emailService.sendPasswordChangedEmail(
        user.id,
        user.email,
        user.username
      );

      Logger.verification('Password changed confirmation email sent', {
        action: 'reset_password',
        userId: user.id,
        email: user.email,
      });
    } catch (emailError) {
      // Log email error but don't fail the password reset
      Logger.error(LogCategory.EMAIL, 'Failed to send password changed email', emailError as Error);
      
      // Email service already logs the error
      // Password reset was successful, so we continue
    }

    // Log successful password reset to security audit log
    await storage.createSecurityAuditLog({
      userId: user.id,
      action: 'reset_password',
      status: 'success',
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      details: {
        method,
        email: user.email,
        tokensInvalidated,
      },
    });

    Logger.verification('Password reset completed successfully', {
      action: 'reset_password',
      userId: user.id,
      username: user.username,
      email: user.email,
      success: true,
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
      data: {
        passwordReset: true,
      },
    });
  } catch (error) {
    // Log error with context
    Logger.error(LogCategory.SECURITY, 'Password reset error', error as Error);

    // Log failed reset attempt to security audit log
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      await storage.createSecurityAuditLog({
        userId: undefined,
        action: 'reset_password',
        status: 'failure',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        details: {
          error: (error as Error).message,
        },
      });
    } catch (logError) {
      // If logging fails, just log to console
      Logger.error(LogCategory.SECURITY, 'Failed to log security audit', logError as Error);
    }

    // Return generic error message
    res.status(500).json({
      success: false,
      message: 'An error occurred during password reset. Please try again later.',
      errors: ['Internal server error'],
    });
  }
}
