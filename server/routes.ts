import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  userRegistrationSchema, 
  documentUploadSchema,
  insertFlashcardSchema,
  insertMcqSchema,
  codeGenerationSchema,
  insertStudyPlanSchema,
  chatMessageSchema,
  type ChatMessage
} from "@shared/schema";
import bcrypt from "bcrypt";
import { handleApiError } from "./middleware/errorHandler";
import { otpRateLimiter, emailRateLimiter } from "./middleware/rateLimiter";
import { jwtAuth } from "./middleware/jwtAuth";
import { validateFlashcardUpdate } from "./middleware/validateFlashcard";
import { TokenGenerator } from "./services/tokenGenerator";
import { emailService } from "./services/email";
import { Logger, LogCategory } from "./utils/logger";
import { jwtService } from "./services/jwtService";
import multer from "multer";
import mammoth from "mammoth";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// @ts-ignore - pdf-parse doesn't have proper types
const pdfParse = require("pdf-parse");

// Analytics cache (5-minute TTL)
const analyticsCache = new Map<string, { data: any; timestamp: number }>();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/rtf',
      'application/rtf',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, TXT, and RTF files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // ===== Authentication Endpoints =====
  
  // Test endpoint to reset rate limiter (development only)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/test/reset-rate-limiter', async (req: Request, res: Response) => {
      try {
        const { otpRateLimitStore } = await import('./middleware/rateLimiter');
        otpRateLimitStore.reset();
        res.json({ message: 'Rate limiter reset successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to reset rate limiter' });
      }
    });
  }
  
  // User registration - PROTECTED with email rate limiting to prevent spam
  app.post('/api/auth/register', emailRateLimiter, async (req: Request, res: Response) => {
    try {
      const userData = userRegistrationSchema.parse(req.body);
      
      Logger.auth('Registration attempt started', {
        action: 'register',
        username: userData.username,
        email: userData.email,
      });
      
      // Check if username or email already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        Logger.security('Registration failed - username already exists', {
          action: 'register',
          username: userData.username,
          reason: 'duplicate_username',
        });
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        Logger.security('Registration failed - email already in use', {
          action: 'register',
          email: userData.email,
          reason: 'duplicate_email',
        });
        return res.status(409).json({ message: "Email address already in use" });
      }
      
      // Hash password with bcrypt (salt rounds = 10)
      const { confirmPassword, ...userToCreate } = userData;
      const hashedPassword = await bcrypt.hash(userToCreate.password, 10);
      
      // Generate verification token and OTP
      const verificationToken = TokenGenerator.generateToken();
      const verificationOtp = TokenGenerator.generateOTP();
      const verificationTokenExpiry = TokenGenerator.generateExpiry(24); // 24 hours
      
      // Create user with hashed password and verification credentials
      const user = await storage.createUser({
        ...userToCreate,
        password: hashedPassword,
        emailVerified: false,
        verificationToken,
        verificationOtp,
        verificationTokenExpiry,
      });
      
      Logger.auth('User account created successfully', {
        action: 'register',
        userId: user.id,
        username: user.username,
        email: user.email,
        emailVerified: false,
      });
      
      // Send welcome email with verification link and OTP
      const verificationLink = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
      
      try {
        await emailService.sendWelcomeEmail(
          user.email,
          user.username,
          verificationLink,
          verificationOtp
        );
      } catch (emailError) {
        // Email service already logs the error
      }
      
      Logger.auth('Registration completed successfully', {
        action: 'register',
        userId: user.id,
        username: user.username,
        email: user.email,
        success: true,
      });
      
      // Don't return password or sensitive token fields in response
      const { password, verificationToken: _, verificationOtp: __, verificationTokenExpiry: ___, 
              resetToken, resetOtp, resetTokenExpiry, ...userResponse } = user;
      
      return res.status(201).json({
        message: "User registered successfully. Please check your email to verify your account.",
        user: userResponse,
        emailSent: true,
        // For development only - include OTP in response
        ...(process.env.NODE_ENV === 'development' && { 
          verificationOtp: verificationOtp,
          verificationLink: verificationLink 
        }),
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // User login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      Logger.auth('Login attempt started', {
        action: 'login',
        username,
      });
      
      if (!username || !password) {
        Logger.security('Login failed - missing credentials', {
          action: 'login',
          reason: 'missing_credentials',
        });
        return res.status(400).json({ message: "Username/Email and password are required" });
      }
      
      // Try to find user by username first, then by email
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      
      // Return 401 for invalid credentials (user not found or password mismatch)
      if (!user) {
        Logger.security('Login failed - user not found', {
          action: 'login',
          username,
          reason: 'user_not_found',
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Use bcrypt.compare() to validate hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        Logger.security('Login failed - invalid password', {
          action: 'login',
          userId: user.id,
          username: user.username,
          reason: 'invalid_password',
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if email is verified
      if (!user.emailVerified) {
        Logger.security('Login failed - email not verified', {
          action: 'login',
          userId: user.id,
          username: user.username,
          email: user.email,
          reason: 'email_not_verified',
        });
        return res.status(403).json({ 
          message: "Please verify your email address before logging in",
          emailVerified: false,
          email: user.email
        });
      }
      
      // Get IP address and user agent for session tracking
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
        || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      // Generate JWT token pair with session tracking
      const tokenPair = await jwtService.generateTokenPair(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified ?? false,
        },
        ipAddress,
        userAgent
      );
      
      // Set accessToken httpOnly cookie with 15-minute expiration
      res.cookie('accessToken', tokenPair.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', // Changed to 'strict' for better security
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
      });
      
      // Set refreshToken httpOnly cookie with 7-day expiration
      res.cookie('refreshToken', tokenPair.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', // Changed to 'strict' for better security
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (reduced from 30 for better security)
        path: '/',
      });
      
      // Update last login timestamp
      await storage.updateUser(user.id, {
        lastLogin: new Date(),
      });
      
      Logger.auth('Login completed successfully', {
        action: 'login',
        userId: user.id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        success: true,
      });
      
      // Return user data (excluding password and sensitive fields) including emailVerified status
      const { password: _, verificationToken, verificationOtp, verificationTokenExpiry, 
              resetToken, resetOtp, resetTokenExpiry, ...userResponse } = user;
      
      return res.status(200).json({
        message: "Login successful",
        user: userResponse
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // User logout
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const userId = req.user?.userId; // May be undefined if token is expired
      
      Logger.auth('Logout attempt', {
        action: 'logout',
        userId,
        hasRefreshToken: !!refreshToken,
      });
      
      // Revoke refresh token if present
      if (refreshToken) {
        await jwtService.revokeRefreshToken(refreshToken);
      }
      
      // Clear accessToken cookie with matching options
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      
      // Clear refreshToken cookie with matching options
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      
      Logger.auth('Logout completed successfully', {
        action: 'logout',
        userId,
        success: true,
      });
      
      return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Logout error', error as Error);
      
      // Still clear cookies even if revocation fails
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
      
      return res.status(200).json({ message: "Logged out successfully" });
    }
  });
  
  // Get current user
  app.get('/api/auth/me', jwtAuth, async (req: Request, res: Response) => {
    try {
      // User is already attached by jwtAuth middleware
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Fetch fresh user data from database
      const user = await storage.getUser(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user data excluding sensitive fields
      const { password, verificationToken, verificationOtp, verificationTokenExpiry,
              resetToken, resetOtp, resetTokenExpiry, ...userResponse } = user;
      
      return res.status(200).json({ user: userResponse });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Forgot password - send reset email - PROTECTED with BOTH email and OTP rate limiting
  app.post('/api/auth/forgot-password', emailRateLimiter, otpRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      Logger.verification('Password reset request started', {
        action: 'forgot_password',
        email,
      });
      
      if (!email) {
        Logger.security('Password reset failed - missing email', {
          action: 'forgot_password',
          reason: 'missing_email',
        });
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Logger.security('Password reset failed - invalid email format', {
          action: 'forgot_password',
          email,
          reason: 'invalid_email_format',
        });
        return res.status(400).json({ 
          message: "Invalid email address format" 
        });
      }
      
      const user = await storage.getUserByEmail(email);
      
      // SECURITY: Return generic message to prevent email enumeration
      if (!user) {
        Logger.security('Password reset failed - user not found', {
          action: 'forgot_password',
          email,
          reason: 'user_not_found',
        });
        return res.status(200).json({ 
          message: "If an account exists with this email, password reset instructions have been sent.",
          emailSent: true,
        });
      }
      
      // Generate both reset token and OTP with 1-hour expiration
      const resetToken = TokenGenerator.generateToken();
      const resetOtp = TokenGenerator.generateOTP();
      const resetTokenExpiry = TokenGenerator.generateExpiry(1); // 1 hour
      
      // Store reset token, OTP, and expiry in database
      await storage.updateUser(user.id, {
        resetToken,
        resetOtp,
        resetTokenExpiry,
      });
      
      Logger.verification('Password reset credentials generated', {
        action: 'forgot_password',
        userId: user.id,
        username: user.username,
        email: user.email,
      });
      
      // Send password reset email with both reset link and OTP code
      const resetLink = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
      
      try {
        await emailService.sendPasswordResetEmail(
          user.email,
          user.username,
          resetLink,
          resetOtp
        );
      } catch (emailError) {
        // Email service already logs the error
      }
      
      Logger.verification('Password reset request completed successfully', {
        action: 'forgot_password',
        userId: user.id,
        username: user.username,
        email: user.email,
        success: true,
      });
      
      return res.status(200).json({ 
        message: "Password reset instructions have been sent to your email address.",
        emailSent: true,
        // For development only - include OTP in response
        ...(process.env.NODE_ENV === 'development' && { 
          resetOtp: resetOtp,
          resetLink: resetLink 
        }),
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Reset password with token or OTP
  app.post('/api/auth/reset-password', otpRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token, otp, password } = req.body;
      const method = token ? 'token' : 'otp';
      
      Logger.verification('Password reset attempt started', {
        action: 'reset_password',
        method,
      });
      
      // Require either token or OTP
      if (!token && !otp) {
        Logger.security('Password reset failed - missing credentials', {
          action: 'reset_password',
          reason: 'missing_credentials',
        });
        return res.status(400).json({ message: "Reset token or OTP is required" });
      }
      
      if (!password) {
        Logger.security('Password reset failed - missing password', {
          action: 'reset_password',
          method,
          reason: 'missing_password',
        });
        return res.status(400).json({ message: "Password is required" });
      }
      
      // Validate new password meets minimum requirements (8 characters)
      if (password.length < 8) {
        Logger.security('Password reset failed - password too short', {
          action: 'reset_password',
          method,
          reason: 'password_too_short',
        });
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      // Query user by reset token OR OTP using storage layer
      let user;
      if (token) {
        user = await storage.getUserByResetToken(token);
      } else if (otp) {
        user = await storage.getUserByResetOtp(otp);
      }
      
      // Validate token/OTP exists
      if (!user) {
        Logger.security('Password reset failed - invalid code', {
          action: 'reset_password',
          method,
          reason: 'invalid_code',
        });
        return res.status(400).json({ message: "Invalid reset code" });
      }
      
      // Check if token/OTP has expired
      if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
        Logger.security('Password reset failed - code expired', {
          action: 'reset_password',
          userId: user.id,
          username: user.username,
          method,
          reason: 'expired_code',
        });
        return res.status(400).json({ 
          message: "Reset code has expired. Please request a new one.",
          expired: true,
        });
      }
      
      // Hash new password using bcrypt with 10 salt rounds
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update user password and clear both reset token and OTP fields
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetOtp: null,
        resetTokenExpiry: null,
      });
      
      Logger.verification('Password reset completed successfully', {
        action: 'reset_password',
        userId: user.id,
        username: user.username,
        email: user.email,
        method,
        success: true,
      });
      
      // Send password changed confirmation email
      try {
        await emailService.sendPasswordChangedEmail(user.email, user.username);
      } catch (emailError) {
        // Email service already logs the error
      }
      
      // Return success response
      return res.status(200).json({ 
        message: "Password has been reset successfully. You can now log in with your new password." 
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Verify email with token or OTP
  app.post('/api/auth/verify-email', otpRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token, otp } = req.body;
      const method = token ? 'token' : 'otp';
      
      Logger.verification('Email verification attempt started', {
        action: 'verify_email',
        method,
      });
      
      // Require either token or OTP
      if (!token && !otp) {
        Logger.security('Email verification failed - missing credentials', {
          action: 'verify_email',
          reason: 'missing_credentials',
        });
        return res.status(400).json({ message: "Verification token or OTP is required" });
      }
      
      // Find user by verification token OR OTP
      let user;
      if (token) {
        user = await storage.getUserByVerificationToken(token);
      } else if (otp) {
        user = await storage.getUserByVerificationOtp(otp);
      }
      
      if (!user) {
        Logger.security('Email verification failed - invalid code', {
          action: 'verify_email',
          method,
          reason: 'invalid_code',
        });
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Check if token/OTP has expired
      if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
        Logger.security('Email verification failed - code expired', {
          action: 'verify_email',
          userId: user.id,
          username: user.username,
          method,
          reason: 'expired_code',
        });
        return res.status(400).json({ 
          message: "Verification code has expired. Please request a new one.",
          expired: true,
        });
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
        return res.status(200).json({ 
          message: "Email is already verified.",
          alreadyVerified: true,
        });
      }
      
      // Mark email as verified and clear both token and OTP
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
      
      return res.status(200).json({ 
        message: "Email has been verified successfully. You can now log in.",
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Resend verification email - PROTECTED with BOTH email and OTP rate limiting to prevent abuse
  app.post('/api/auth/resend-verification', emailRateLimiter, otpRateLimiter, async (req: Request, res: Response) => {
    try {
      Logger.verification('Resend verification email attempt', {
        action: 'resend_verification',
        authenticated: !!req.user?.userId,
        email: req.body.email,
      });
      
      // SECURITY: Require email in request body (no authenticated user support to prevent abuse)
      const { email } = req.body;
      
      if (!email) {
        Logger.security('Resend verification failed - missing email', {
          action: 'resend_verification',
          reason: 'missing_email',
        });
        return res.status(400).json({ 
          message: "Email address is required" 
        });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Logger.security('Resend verification failed - invalid email format', {
          action: 'resend_verification',
          email,
          reason: 'invalid_email_format',
        });
        return res.status(400).json({ 
          message: "Invalid email address format" 
        });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        Logger.security('Resend verification failed - user not found', {
          action: 'resend_verification',
          email,
          reason: 'user_not_found',
        });
        // SECURITY: Return generic message to prevent email enumeration
        return res.status(200).json({ 
          message: "If an account exists with this email, a verification email has been sent." 
        });
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
        return res.status(400).json({ message: "Email is already verified" });
      }
      
      // Generate new verification token and OTP, invalidate previous credentials
      const verificationToken = TokenGenerator.generateToken();
      const verificationOtp = TokenGenerator.generateOTP();
      const verificationTokenExpiry = TokenGenerator.generateExpiry(24); // 24 hours
      
      // Update user with new verification credentials
      await storage.updateUser(user.id, {
        verificationToken,
        verificationOtp,
        verificationTokenExpiry,
      });
      
      Logger.verification('New verification credentials generated', {
        action: 'resend_verification',
        userId: user.id,
        username: user.username,
        email: user.email,
      });
      
      // Send new verification email with both link and OTP
      const verificationLink = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
      
      try {
        await emailService.sendVerificationEmail(
          user.email,
          user.username,
          verificationLink,
          verificationOtp
        );
      } catch (emailError) {
        // Email service already logs the error
      }
      
      Logger.verification('Resend verification completed successfully', {
        action: 'resend_verification',
        userId: user.id,
        username: user.username,
        email: user.email,
        success: true,
      });
      
      return res.status(200).json({ 
        message: "Verification email has been sent. Please check your inbox.",
        // For development only - include OTP in response
        ...(process.env.NODE_ENV === 'development' && { 
          verificationOtp: verificationOtp,
          verificationLink: verificationLink 
        }),
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Logout from all devices - revoke all refresh tokens
  app.post('/api/auth/logout-all', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      Logger.auth('Logout from all devices attempt', {
        action: 'logout_all',
        userId,
      });
      
      // Revoke all refresh tokens for this user
      await jwtService.revokeAllUserTokens(userId);
      
      // Clear cookies for current session
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
      
      Logger.auth('Logout from all devices completed', {
        action: 'logout_all',
        userId,
        success: true,
      });
      
      return res.status(200).json({ 
        message: "Logged out from all devices successfully" 
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get active sessions count
  app.get('/api/auth/sessions', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const sessionCount = await jwtService.getActiveSessionCount(userId);
      
      return res.status(200).json({ 
        activeSessions: sessionCount 
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Refresh token endpoint (optional - middleware handles this automatically)
  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ 
          message: "No refresh token provided",
          code: 'NO_REFRESH_TOKEN'
        });
      }
      
      // Verify refresh token
      const payload = await jwtService.verifyRefreshToken(refreshToken);
      
      if (!payload) {
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
        
        return res.status(401).json({ 
          message: "Invalid or expired refresh token",
          code: 'INVALID_REFRESH_TOKEN'
        });
      }
      
      // Get user from database
      const user = await storage.getUser(payload.userId);
      
      if (!user || !user.isActive) {
        return res.status(401).json({ 
          message: "User not found or inactive",
          code: 'USER_INVALID'
        });
      }
      
      // Get IP and user agent
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
        || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      // Generate new token pair
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
      
      // Revoke old refresh token
      await jwtService.revokeRefreshToken(refreshToken);
      
      // Set new cookies
      res.cookie('accessToken', newTokenPair.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
      });
      
      res.cookie('refreshToken', newTokenPair.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
      
      Logger.auth('Token refreshed via refresh endpoint', {
        action: 'token_refresh_endpoint',
        userId: user.id,
      });
      
      return res.status(200).json({ 
        message: "Token refreshed successfully" 
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== Document Management Endpoints =====
  
  // Extract text from uploaded file (PDF, Word, etc.)
  app.post('/api/extract-text', jwtAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
          error: "Please select a file to upload"
        });
      }

      const file = req.file;
      let extractedText = '';

      Logger.debug(LogCategory.SECURITY, 'Text extraction started', {
        userId: req.user?.userId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      // Extract text based on file type
      if (file.mimetype === 'application/pdf') {
        // Extract text from PDF
        try {
          // Custom render function to better handle text extraction
          const renderPage = (pageData: any) => {
            // Render text with proper spacing
            let renderOptions = {
              normalizeWhitespace: true,
              disableCombineTextItems: false
            };
            
            return pageData.getTextContent(renderOptions)
              .then((textContent: any) => {
                let lastY: number | null = null;
                let text = '';
                
                for (let item of textContent.items) {
                  // Add line break if Y position changed significantly
                  if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
                    text += '\n';
                  }
                  text += item.str;
                  lastY = item.transform[5];
                }
                
                return text;
              });
          };
          
          const pdfData = await pdfParse(file.buffer, {
            max: 0, // Parse all pages
            pagerender: renderPage
          });
          extractedText = pdfData.text;
          
          Logger.debug(LogCategory.SECURITY, 'PDF text extraction successful', {
            userId: req.user?.userId,
            fileName: file.originalname,
            pages: pdfData.numpages,
            textLength: extractedText.length,
          });
        } catch (pdfError) {
          Logger.error(LogCategory.SECURITY, 'PDF extraction failed', pdfError, {
            userId: req.user?.userId,
            fileName: file.originalname,
          });
          return res.status(400).json({
            message: "Failed to extract text from PDF",
            error: "The PDF file may be corrupted, encrypted, or contain only images."
          });
        }
      } else if (
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        // Extract text from Word document
        try {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          extractedText = result.value;
          
          Logger.debug(LogCategory.SECURITY, 'Word document text extraction successful', {
            userId: req.user?.userId,
            fileName: file.originalname,
            textLength: extractedText.length,
            messages: result.messages.length,
          });
          
          // Log any warnings from mammoth
          if (result.messages.length > 0) {
            Logger.security('Word extraction warnings', {
              userId: req.user?.userId,
              fileName: file.originalname,
              warnings: result.messages,
            });
          }
        } catch (wordError) {
          Logger.error(LogCategory.SECURITY, 'Word extraction failed', wordError, {
            userId: req.user?.userId,
            fileName: file.originalname,
          });
          return res.status(400).json({
            message: "Failed to extract text from Word document",
            error: "The document may be corrupted or in an unsupported format."
          });
        }
      } else if (file.mimetype === 'text/plain' || file.mimetype === 'text/rtf' || file.mimetype === 'application/rtf') {
        // Plain text or RTF
        extractedText = file.buffer.toString('utf-8');
        
        // Basic RTF cleanup if needed
        if (file.mimetype === 'text/rtf' || file.mimetype === 'application/rtf') {
          extractedText = extractedText.replace(/\\[a-z]+\d*\s?/g, '').replace(/[{}]/g, '');
        }
        
        Logger.debug(LogCategory.SECURITY, 'Text file extraction successful', {
          userId: req.user?.userId,
          fileName: file.originalname,
          textLength: extractedText.length,
        });
      } else {
        return res.status(400).json({
          message: "Unsupported file type",
          error: "Please upload a PDF, Word, TXT, or RTF file."
        });
      }

      // Clean up the extracted text
      extractedText = extractedText.trim();
      
      // Fix line breaks and merge incomplete lines (common in PDF extraction)
      // This handles cases where PDF text is cut off mid-sentence
      extractedText = extractedText
        // Remove hyphenation at line breaks
        .replace(/-\n/g, '')
        .replace(/-\r\n/g, '')
        // Merge lines that end with incomplete words (no punctuation)
        // This fixes "from the s\nil" -> "from the soil"
        .replace(/([a-z])\s*[\r\n]+\s*([a-z])/gi, '$1 $2')
        // Merge lines that end with comma or other continuation
        .replace(/([,;:])\s*[\r\n]+\s*/g, '$1 ')
        // Fix lines that end mid-word (common in multi-column PDFs)
        .replace(/([a-z])\s*[\r\n]+([a-z]{1,3})\s/gi, '$1$2 ')
        // Normalize multiple spaces
        .replace(/[ \t]+/g, ' ')
        // Normalize multiple line breaks
        .replace(/[\r\n]{3,}/g, '\n\n')
        // Clean up any remaining odd spacing
        .replace(/\s+\./g, '.')
        .replace(/\s+,/g, ',')
        .trim();

      // Validate extracted text
      if (!extractedText || extractedText.length < 10) {
        Logger.security('Extracted text too short', {
          userId: req.user?.userId,
          fileName: file.originalname,
          textLength: extractedText.length,
        });
        return res.status(400).json({
          message: "No text found in document",
          error: "The document appears to be empty or contains only images."
        });
      }

      Logger.debug(LogCategory.SECURITY, 'Text extraction completed successfully', {
        userId: req.user?.userId,
        fileName: file.originalname,
        textLength: extractedText.length,
      });

      return res.status(200).json({
        message: "Text extracted successfully",
        text: extractedText,
        fileName: file.originalname,
        fileSize: file.size,
        textLength: extractedText.length,
        wordCount: extractedText.split(/\s+/).length,
      });
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Text extraction error', error, {
        userId: req.user?.userId,
      });
      return handleApiError(error, res);
    }
  });
  
  // Upload/create document
  app.post('/api/documents', jwtAuth, async (req: Request, res: Response) => {
    try {
      const docData = documentUploadSchema.parse(req.body);
      const userId = req.user?.userId!;
      
      const document = await storage.createDocument({
        ...docData,
        userId
      });
      
      return res.status(201).json({
        message: "Document created successfully",
        document
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get all user documents (with pagination)
  app.get('/api/documents', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await storage.getDocumentsByUserId(userId, page, limit);
      
      return res.status(200).json(result);
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get document by ID
  app.get('/api/documents/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if document belongs to the user
      if (document.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      return res.status(200).json({ document });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update document
  app.patch('/api/documents/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if document belongs to the user
      if (document.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedDocument = await storage.updateDocument(documentId, req.body);
      
      return res.status(200).json({
        message: "Document updated successfully",
        document: updatedDocument
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Delete document
  app.delete('/api/documents/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if document belongs to the user
      if (document.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteDocument(documentId);
      
      return res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Summarize document or text
  app.post('/api/documents/summarize', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { text, type, documentId } = req.body;
      
      if (!text && !documentId) {
        return res.status(400).json({ message: "Either text or documentId is required" });
      }
      
      let textToSummarize = text;
      
      // If documentId is provided, fetch the document
      if (documentId) {
        const document = await storage.getDocumentById(parseInt(documentId));
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        // Check if document belongs to the user
        if (document.userId !== req.user?.userId!) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        textToSummarize = document.content || '';
      }
      
      if (!textToSummarize) {
        return res.status(400).json({ message: "No text content to summarize" });
      }
      
      // Import and use the Gemini service
      const { geminiService } = await import('./services/gemini');
      
      // Determine max length based on summary type
      let maxLength = 500;
      switch (type) {
        case 'concise':
          maxLength = 200;
          break;
        case 'detailed':
          maxLength = 800;
          break;
        case 'eli5':
          maxLength = 300;
          break;
        case 'academic':
          maxLength = 600;
          break;
      }
      
      let summary;
      try {
        const result = await geminiService.summarizeText(textToSummarize, maxLength, req.user?.userId);
        summary = result.summary;
      } catch (error) {
        console.error("Error generating summary:", error);
        return res.status(500).json({ message: "Failed to generate summary" });
      }
      
      // If documentId was provided, update the document with the summary
      if (documentId) {
        await storage.updateDocument(parseInt(documentId), { summary });
      }
      
      return res.status(200).json({
        message: "Summary generated successfully",
        summary
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // ===== Summary Endpoints =====
  
  // Create summary (generate and save to database)
  app.post('/api/summaries', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { documentId, originalText, type } = req.body;
      const userId = req.user?.userId!;
      
      if (!documentId && !originalText) {
        return res.status(400).json({ message: "Either documentId or originalText is required" });
      }
      
      let textToSummarize = originalText;
      let docId = documentId;
      
      // If documentId is provided, fetch the document
      if (documentId) {
        const document = await storage.getDocumentById(parseInt(documentId));
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        // Check if document belongs to the user
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        textToSummarize = document.content || originalText || '';
        docId = document.id;
      }
      
      if (!textToSummarize) {
        return res.status(400).json({ message: "No text content to summarize" });
      }
      
      // Import and use the Gemini service
      const { geminiService } = await import('./services/gemini');
      
      // Determine max length based on summary type
      let maxLength = 500;
      switch (type) {
        case 'concise':
          maxLength = 200;
          break;
        case 'detailed':
          maxLength = 800;
          break;
        case 'eli5':
          maxLength = 300;
          break;
        case 'academic':
          maxLength = 600;
          break;
      }
      
      let summaryResult;
      try {
        summaryResult = await geminiService.summarizeText(
          textToSummarize, 
          maxLength, 
          userId,
          type as 'concise' | 'detailed' | 'eli5' | 'academic' | 'balanced'
        );
      } catch (error: any) {
        console.error("Error generating summary:", error);
        
        const errorMessage = error.message?.toLowerCase() || '';
        
        // Check for quota/rate limit errors (multiple patterns)
        if (errorMessage.includes('quota') || 
            errorMessage.includes('too many requests') || 
            errorMessage.includes('rate limit') ||
            errorMessage.includes('429')) {
          return res.status(429).json({ 
            message: "Daily limit reached",
            error: "You've used all 50 free AI summaries for today. The limit resets in 24 hours. Please try again tomorrow.",
            retryAfter: "24 hours"
          });
        }
        
        // Check for text length errors
        if (errorMessage.includes('maximum length') || errorMessage.includes('too long')) {
          return res.status(400).json({ 
            message: "Text too long",
            error: "The document is too long to summarize. Please reduce the text length and try again."
          });
        }
        
        return res.status(500).json({ 
          message: "Failed to generate summary",
          error: error.message || "An unexpected error occurred while generating the summary."
        });
      }
      
      // Save summary to database
      const savedSummary = await storage.createSummary({
        userId,
        documentId: docId || null,
        originalText: textToSummarize,
        summary: summaryResult.summary,
        keyPoints: summaryResult.keyPoints,
        keywords: summaryResult.keywords,
      });
      
      // Return enhanced summary with all metadata
      return res.status(201).json({
        message: "Summary created successfully",
        summary: {
          ...savedSummary,
          metadata: {
            readingTime: summaryResult.readingTime,
            difficultyLevel: summaryResult.difficultyLevel,
            compression: summaryResult.compression,
            status: 'Generated',
            insights: summaryResult.insights,
            applications: summaryResult.applications,
            relatedLinks: summaryResult.relatedLinks,
          }
        }
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get all summaries for the user
  app.get('/api/summaries', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const documentId = req.query.documentId ? parseInt(req.query.documentId as string) : null;
      
      let summaries;
      
      if (documentId) {
        // Check if document belongs to user
        const document = await storage.getDocumentById(documentId);
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied to the document" });
        }
        
        summaries = await storage.getSummariesByDocumentId(documentId);
      } else {
        summaries = await storage.getSummariesByUserId(userId);
      }
      
      return res.status(200).json({ summaries });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get summary by ID
  app.get('/api/summaries/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const summaryId = parseInt(req.params.id);
      const summary = await storage.getSummaryById(summaryId);
      
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }
      
      // Check if summary belongs to the user
      if (summary.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      return res.status(200).json({ summary });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update summary
  app.patch('/api/summaries/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const summaryId = parseInt(req.params.id);
      const summary = await storage.getSummaryById(summaryId);
      
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }
      
      // Check if summary belongs to the user
      if (summary.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedSummary = await storage.updateSummary(summaryId, req.body);
      
      return res.status(200).json({
        message: "Summary updated successfully",
        summary: updatedSummary
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Delete summary
  app.delete('/api/summaries/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const summaryId = parseInt(req.params.id);
      const summary = await storage.getSummaryById(summaryId);
      
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }
      
      // Check if summary belongs to the user
      if (summary.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteSummary(summaryId);
      
      return res.status(200).json({ message: "Summary deleted successfully" });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== AI Chat Endpoints =====
  
  // Start or continue chat session
  app.post('/api/chat', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { message, sessionId, subject } = req.body;
      const userId = req.user?.userId!;
      
      // Validate message format
      const validatedMessage = chatMessageSchema.parse({
        role: "user",
        content: message
      });
      
      let chatHistory;
      
      if (sessionId) {
        // Get existing chat session
        chatHistory = await storage.getChatHistoryById(parseInt(sessionId));
        
        if (!chatHistory) {
          return res.status(404).json({ message: "Chat session not found" });
        }
        
        // Check if chat belongs to the user
        if (chatHistory.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        // Update existing chat with new message
        chatHistory = await storage.updateChatHistory(parseInt(sessionId), validatedMessage);
      } else {
        // Create new chat session
        chatHistory = await storage.createChatHistory({
          userId,
          sessionId: Date.now().toString(),
          messages: [validatedMessage],
          subject: subject || null
        });
      }
      
      // Get all previous messages to provide context
      const messages = chatHistory ? (Array.isArray(chatHistory.messages) 
        ? chatHistory.messages 
        : JSON.parse((chatHistory.messages as string) || '[]')) : [];
      
      // Import chat summarization utilities
      const { shouldSummarizeConversation, createSummarizationPrompt, truncateWithSummary } = await import('./utils/chatSummarization');
      
      // Check if conversation needs summarization (more than 20 messages)
      let processedMessages = messages;
      if (shouldSummarizeConversation(messages, 20)) {
        try {
          // Generate summary of older messages
          const { geminiService } = await import('./services/gemini');
          const summaryPrompt = createSummarizationPrompt(messages.slice(0, -10));
          const summary = await geminiService.generateContent(summaryPrompt, {}, userId);
          
          // Truncate messages and add summary
          processedMessages = truncateWithSummary(messages, 10, summary);
        } catch (error) {
          console.error("Error summarizing conversation:", error);
          // If summarization fails, just use recent messages
          processedMessages = messages.slice(-15);
        }
      }
      
      // Prepare messages for Gemini (convert assistant to model)
      const apiMessages = processedMessages.map((msg: ChatMessage) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      }));
      
      // Get user info for personalization
      const user = await storage.getUser(userId);
      const userName = user?.fullName?.split(' ')[0] || user?.username || user?.email?.split('@')[0] || "there";
      
      // Add system message at the beginning for better context
      if (apiMessages.length <= 1 || !apiMessages.some((msg: { role: string }) => msg.role === 'system')) {
        // Generate personalized greeting for first message
        const greetings = [
          `Hey ${userName}! 👋`,
          `Hi ${userName}! 😊`,
          `Hello ${userName}! 🎓`,
          `Welcome ${userName}! 🌟`,
        ];
        const selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        
        apiMessages.unshift({
          role: "system",
          content: "You are Jadoo, an AI-powered study assistant created specifically for StudyForge platform. " +
            "Your identity is Jadoo - NOT Google's AI, NOT Gemini, NOT any other AI. " +
            "When asked 'who are you' or similar questions, ALWAYS respond that you are Jadoo, the StudyForge AI study assistant. " +
            "\n\nYour purpose is to help students learn effectively across multiple subjects. " +
            "You can explain complex topics in simple terms, provide examples, create study materials, and answer questions. " +
            "Always be encouraging, helpful, patient, and focus on explaining concepts clearly. " +
            `\n\nIMPORTANT: For your FIRST response in a new conversation, start with a personalized greeting: "${selectedGreeting} I'm Jadoo, your AI study assistant" and then naturally continue with your response to help the user.\n` +
            "\n\nFORMATTING RULES:\n" +
            "1. When providing code examples, ALWAYS use this format:\n" +
            "   - Write the heading OUTSIDE the code block (e.g., 'Example 1: Printing Numbers')\n" +
            "   - Then on a new line, start the code block with ```language\n" +
            "   - Write the code\n" +
            "   - End with ```\n" +
            "2. NEVER merge headings and code in the same block\n" +
            "3. Use proper markdown: # for h1, ## for h2, ### for h3\n" +
            "4. Use - for bullet points\n" +
            "5. Use **text** for bold\n" +
            `${subject ? `This conversation is about ${subject}.` : ""}`
        });
      }
      
      // Import and use the Gemini service
      const { geminiService } = await import('./services/gemini');
      let aiResponseContent: string;
      
      try {
        aiResponseContent = await geminiService.generateChatResponse(apiMessages, {}, userId);
      } catch (error) {
        console.error("Error generating AI response:", error);
        aiResponseContent = "I'm sorry, I encountered an error processing your request. Please try again.";
      }
      
      const aiResponse = {
        role: "assistant",
        content: aiResponseContent,
        timestamp: new Date()
      };
      
      // Add AI response to chat history
      if (chatHistory) {
        chatHistory = await storage.updateChatHistory(chatHistory.id, {
          role: "assistant" as "user" | "assistant" | "system",
          content: aiResponseContent,
          timestamp: new Date()
        });
      }
      
      return res.status(200).json({
        message: "Chat message processed",
        response: aiResponse,
        chatHistory
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get user's chat history
  app.get('/api/chat/history', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const history = await storage.getChatHistoriesByUserId(userId);
      
      // Return array directly for frontend compatibility
      return res.status(200).json(history);
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Get specific chat session by ID
  app.get('/api/chat/history/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const chatId = parseInt(req.params.id);
      
      if (isNaN(chatId)) {
        return res.status(400).json({ message: "Invalid chat ID" });
      }
      
      const chatHistory = await storage.getChatHistoryById(chatId);
      
      if (!chatHistory) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      
      // Check if chat belongs to the user
      if (chatHistory.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      return res.status(200).json({ chatHistory });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Update chat session (edit title/subject)
  app.patch('/api/chat/history/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const chatId = parseInt(req.params.id);
      const { subject } = req.body;
      
      if (isNaN(chatId)) {
        return res.status(400).json({ message: "Invalid chat ID" });
      }
      
      const chatHistory = await storage.getChatHistoryById(chatId);
      
      if (!chatHistory) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      
      // Check if chat belongs to the user
      if (chatHistory.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update the chat subject
      const updatedChat = await storage.updateChatHistorySubject(chatId, subject);
      
      Logger.debug(LogCategory.SECURITY, 'Chat history updated', {
        action: 'update_chat',
        userId,
        chatId,
      });
      
      return res.status(200).json({ 
        message: "Chat updated successfully",
        chatHistory: updatedChat 
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Delete chat session
  app.delete('/api/chat/history/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const chatId = parseInt(req.params.id);
      
      if (isNaN(chatId)) {
        return res.status(400).json({ message: "Invalid chat ID" });
      }
      
      const chatHistory = await storage.getChatHistoryById(chatId);
      
      if (!chatHistory) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      
      // Check if chat belongs to the user
      if (chatHistory.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the chat
      await storage.deleteChatHistory(chatId);
      
      Logger.debug(LogCategory.SECURITY, 'Chat history deleted', {
        action: 'delete_chat',
        userId,
        chatId,
      });
      
      return res.status(200).json({ 
        message: "Chat deleted successfully" 
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Save message feedback (like/dislike)
  app.post('/api/feedback', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { messageId, type } = req.body;
      const userId = req.user?.userId!;

      if (!messageId || !type) {
        return res.status(400).json({ message: "messageId and type are required" });
      }

      // Validate type
      const validTypes = ['like', 'dislike', 'unlike', 'undislike', 'regenerate'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid feedback type" });
      }

      // Create feedback record
      const feedback = await storage.createFeedback({
        messageId,
        userId,
        type,
      });

      return res.status(201).json({
        message: "Feedback saved successfully",
        feedback,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Regenerate AI response for a message
  app.post('/api/chat/regenerate', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId, messageIndex } = req.body;
      const userId = req.user?.userId!;

      if (!sessionId) {
        return res.status(400).json({ message: "sessionId is required" });
      }

      // Get chat history
      const chatHistory = await storage.getChatHistoryById(parseInt(sessionId));

      if (!chatHistory) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Check if chat belongs to the user
      if (chatHistory.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get messages
      const messages = Array.isArray(chatHistory.messages)
        ? chatHistory.messages
        : JSON.parse((chatHistory.messages as string) || '[]');

      // Get the user message before the AI response to regenerate
      let contextMessages = messages;
      if (typeof messageIndex === 'number' && messageIndex > 0) {
        contextMessages = messages.slice(0, messageIndex);
      }

      // Prepare messages for Gemini
      const apiMessages = contextMessages.map((msg: ChatMessage) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      }));

      // Add system message if not present
      if (!apiMessages.some((msg: { role: string }) => msg.role === 'system')) {
        apiMessages.unshift({
          role: "system",
          content: "You are Jadoo, an AI-powered study assistant created specifically for StudyForge platform. " +
            "Your identity is Jadoo - NOT Google's AI, NOT Gemini, NOT any other AI. " +
            "When asked 'who are you' or similar questions, ALWAYS respond that you are Jadoo, the StudyForge AI study assistant. " +
            "\n\nYour purpose is to help students learn effectively across multiple subjects. " +
            "You can explain complex topics in simple terms, provide examples, create study materials, and answer questions. " +
            "Always be encouraging, helpful, patient, and focus on explaining concepts clearly. " +
            "\n\nFORMATTING RULES:\n" +
            "1. When providing code examples, ALWAYS use this format:\n" +
            "   - Write the heading OUTSIDE the code block (e.g., 'Example 1: Printing Numbers')\n" +
            "   - Then on a new line, start the code block with ```language\n" +
            "   - Write the code\n" +
            "   - End with ```\n" +
            "2. NEVER merge headings and code in the same block\n" +
            "3. Use proper markdown: # for h1, ## for h2, ### for h3\n" +
            "4. Use - for bullet points\n" +
            "5. Use **text** for bold"
        });
      }

      // Generate new response
      const { geminiService } = await import('./services/gemini');
      let aiResponseContent: string;

      try {
        aiResponseContent = await geminiService.generateChatResponse(apiMessages, {}, userId);
      } catch (error) {
        console.error("Error generating AI response:", error);
        aiResponseContent = "I'm sorry, I encountered an error processing your request. Please try again.";
      }

      const aiResponse = {
        role: "assistant",
        content: aiResponseContent,
        timestamp: new Date()
      };

      // Save feedback for regeneration
      await storage.createFeedback({
        messageId: sessionId,
        userId,
        type: 'regenerate',
      });

      return res.status(200).json({
        message: "Response regenerated successfully",
        response: aiResponse,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Report a message
  app.post('/api/report', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { messageId, messageContent, reason } = req.body;
      const userId = req.user?.userId!;

      if (!messageContent) {
        return res.status(400).json({ message: "messageContent is required" });
      }

      Logger.security('Message reported', {
        action: 'report_message',
        userId,
        messageId,
        reason: reason || 'user_reported',
      });

      // Save report as feedback
      await storage.createFeedback({
        messageId: messageId || 0,
        userId,
        type: 'report',
      });

      return res.status(200).json({
        message: "Report submitted successfully",
        success: true,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Save a message to user's collection
  app.post('/api/messages/save', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { messageId, messageContent } = req.body;
      const userId = req.user?.userId!;

      if (!messageContent) {
        return res.status(400).json({ message: "messageContent is required" });
      }

      // Create a document with the saved message
      const savedMessage = await storage.createDocument({
        userId,
        title: `Saved Message - ${new Date().toLocaleDateString()}`,
        content: messageContent,
        fileType: 'txt',
        summary: messageContent.substring(0, 200) + (messageContent.length > 200 ? '...' : ''),
      });

      Logger.debug(LogCategory.SECURITY, 'Message saved', {
        action: 'save_message',
        userId,
        messageId,
        documentId: savedMessage.id,
      });

      return res.status(200).json({
        message: "Message saved successfully",
        document: savedMessage,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== Flashcard Endpoints =====
  
   // Create flashcard
  app.post('/api/flashcards', jwtAuth, async (req: Request, res: Response) => {
    try {
      const flashcardData = insertFlashcardSchema.parse(req.body);
      const userId = req.user?.userId!;
      
      // If document ID is provided, check if document exists and belongs to user
      if (flashcardData.documentId) {
        const document = await storage.getDocumentById(flashcardData.documentId);
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied to the document" });
        }
      }
      
      const flashcard = await storage.createFlashcard({
        ...flashcardData,
        userId: userId!,
        documentId: flashcardData.documentId ?? undefined
      } as any);
      
      return res.status(201).json({
        message: "Flashcard created successfully",
        flashcard
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get flashcards by document ID or all user flashcards (with pagination)
  app.get('/api/flashcards', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const documentId = req.query.documentId ? parseInt(req.query.documentId as string) : null;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (documentId) {
        // Check if document belongs to user
        const document = await storage.getDocumentById(documentId);
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied to the document" });
        }
        
        // For document-specific queries, return all (no pagination)
        const flashcards = await storage.getFlashcardsByDocumentId(documentId);
        return res.status(200).json({ flashcards });
      } else {
        // For user queries, use pagination
        const result = await storage.getFlashcardsByUserId(userId, page, limit);
        return res.status(200).json(result);
      }
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update flashcard
  app.patch('/api/flashcards/:id', jwtAuth, validateFlashcardUpdate, async (req: Request, res: Response) => {
    try {
      const flashcardId = parseInt(req.params.id);
      
      // Validate flashcard ID
      if (isNaN(flashcardId) || flashcardId <= 0) {
        return res.status(400).json({ message: "Invalid flashcard ID" });
      }
      
      const flashcard = await storage.getFlashcardById(flashcardId);
      
      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }
      
      // Check if flashcard belongs to the user (ownership verification)
      if (flashcard.userId !== req.user?.userId!) {
        Logger.security('Unauthorized flashcard update attempt', {
          userId: req.user?.userId,
          flashcardId,
          ownerId: flashcard.userId,
        });
        return res.status(403).json({ message: "Access denied. You can only update your own flashcards." });
      }
      
      // Update the flashcard with validated data
      const updatedFlashcard = await storage.updateFlashcard(flashcardId, req.body);
      
      if (!updatedFlashcard) {
        return res.status(500).json({ message: "Failed to update flashcard" });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Flashcard updated successfully', {
        userId: req.user?.userId,
        flashcardId,
        updatedFields: Object.keys(req.body),
      });
      
      return res.status(200).json({
        message: "Flashcard updated successfully",
        flashcard: updatedFlashcard
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Delete flashcard
  app.delete('/api/flashcards/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const flashcardId = parseInt(req.params.id);
      const flashcard = await storage.getFlashcardById(flashcardId);
      
      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }
      
      // Check if flashcard belongs to the user
      if (flashcard.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteFlashcard(flashcardId);
      
      return res.status(200).json({ message: "Flashcard deleted successfully" });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Generate flashcard with AI
  app.post('/api/flashcards/generate', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { topic, context } = req.body;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }
      
      // Import and use the Gemini service
      const { geminiService } = await import('./services/gemini');
      
      let flashcardData;
      try {
        flashcardData = await geminiService.generateFlashcard(topic, context, req.user?.userId);
      } catch (error) {
        console.error("Error generating flashcard:", error);
        return res.status(500).json({ message: "Failed to generate flashcard" });
      }
      
      return res.status(200).json({
        message: "Flashcard generated successfully",
        question: flashcardData.question,
        answer: flashcardData.answer,
        category: "general",
        difficulty: "medium"
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Review flashcard (update spaced repetition data)
  app.post('/api/flashcards/:id/review', jwtAuth, async (req: Request, res: Response) => {
    try {
      const flashcardId = parseInt(req.params.id);
      const { correct, confidence } = req.body;
      
      const flashcard = await storage.getFlashcardById(flashcardId);
      
      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }
      
      // Check if flashcard belongs to the user
      if (flashcard.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Import SM-2 algorithm utilities
      const { calculateSM2, booleanToQuality, calculateNextReviewDate, calculateStreak } = await import('./utils/spacedRepetition');
      
      // Convert boolean to quality rating (0-5)
      const quality = booleanToQuality(correct, confidence);
      
      // Calculate new spaced repetition parameters using SM-2 algorithm
      const sm2Result = calculateSM2(
        quality,
        flashcard.repetitionInterval || 1,
        flashcard.easeFactor || 250,
        0 // We don't track repetitions separately, so use 0
      );
      
      // Calculate next review date
      const nextReviewDate = calculateNextReviewDate(sm2Result.interval);
      const now = new Date();
      
      // Update flashcard
      const updatedFlashcard = await storage.updateFlashcard(flashcardId, {
        repetitionInterval: sm2Result.interval,
        easeFactor: sm2Result.easeFactor,
        lastReviewed: now,
        nextReviewDate: nextReviewDate
      });
      
      // Update user stats
      const userId = req.user?.userId!;
      const userStats = await storage.getUserStats(userId);
      
      if (userStats) {
        // Calculate streak
        const newStreak = calculateStreak(
          userStats.lastActive,
          userStats.streakDays || 0,
          now
        );
        
        await storage.updateUserStats(userId, {
          flashcardsReviewed: (userStats.flashcardsReviewed || 0) + 1,
          correctFlashcards: (userStats.correctFlashcards || 0) + (correct ? 1 : 0),
          incorrectFlashcards: (userStats.incorrectFlashcards || 0) + (correct ? 0 : 1),
          streakDays: newStreak,
          longestStreak: Math.max(userStats.longestStreak || 0, newStreak),
          lastActive: now,
        });
      }
      
      return res.status(200).json({
        message: "Flashcard reviewed successfully",
        flashcard: updatedFlashcard,
        nextReview: {
          interval: sm2Result.interval,
          date: nextReviewDate,
        }
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get due flashcards for review
  app.get('/api/flashcards/due', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const limit = parseInt(req.query.limit as string) || 20;
      
      // Get all user's flashcards
      const { flashcards } = await storage.getFlashcardsByUserId(userId);
      
      // Import utility to check if card is due
      const { isCardDue } = await import('./utils/spacedRepetition');
      
      // Filter for due cards
      const dueFlashcards = flashcards.filter(card => isCardDue(card.nextReviewDate));
      
      // Sort by next review date (oldest first, null dates first)
      dueFlashcards.sort((a, b) => {
        if (!a.nextReviewDate) return -1;
        if (!b.nextReviewDate) return 1;
        return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
      });
      
      // Limit results
      const limitedDueCards = dueFlashcards.slice(0, limit);
      
      return res.status(200).json({
        flashcards: limitedDueCards,
        total: dueFlashcards.length,
        showing: limitedDueCards.length,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Generate multiple flashcards from document using AI
  app.post('/api/documents/:id/generate-flashcards', jwtAuth, async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const userId = req.user?.userId!;
      const { count = 10, difficulty = 'medium' } = req.body;
      
      // Validate document ID
      if (isNaN(documentId) || documentId <= 0) {
        return res.status(400).json({ message: "Invalid document ID" });
      }
      
      // Validate count
      if (count < 5 || count > 20) {
        return res.status(400).json({ message: "Count must be between 5 and 20" });
      }
      
      // Validate difficulty
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ message: "Difficulty must be easy, medium, or hard" });
      }
      
      // Get document and verify ownership
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.userId !== userId) {
        Logger.security('Unauthorized flashcard generation attempt', {
          userId,
          documentId,
          ownerId: document.userId,
        });
        return res.status(403).json({ message: "Access denied. You can only generate flashcards from your own documents." });
      }
      
      // Check if document has content
      if (!document.content || document.content.trim().length < 100) {
        return res.status(400).json({ message: "Document content is too short to generate flashcards" });
      }
      
      // Import and use the Gemini service
      const { geminiService } = await import('./services/gemini');
      
      Logger.debug(LogCategory.SECURITY, 'Bulk flashcard generation started', {
        userId,
        documentId,
        count,
        difficulty,
        contentLength: document.content.length,
      });
      
      let flashcardsData;
      try {
        flashcardsData = await geminiService.generateFlashcardsFromDocument(
          document.content,
          count,
          difficulty,
          userId
        );
      } catch (error) {
        Logger.error(LogCategory.SECURITY, 'Bulk flashcard generation failed', error, {
          userId,
          documentId,
          count,
          difficulty,
        });
        return res.status(500).json({ 
          message: "Failed to generate flashcards", 
          error: (error as Error).message 
        });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Bulk flashcard generation completed', {
        userId,
        documentId,
        generatedCount: flashcardsData.length,
      });
      
      return res.status(200).json({
        message: `Successfully generated ${flashcardsData.length} flashcards`,
        flashcards: flashcardsData,
        documentId,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Save multiple flashcards at once (bulk create)
  app.post('/api/flashcards/bulk', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { flashcards, documentId } = req.body;
      const userId = req.user?.userId!;
      
      // Validate flashcards array
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        return res.status(400).json({ message: "Flashcards array is required and must not be empty" });
      }
      
      if (flashcards.length > 20) {
        return res.status(400).json({ message: "Cannot create more than 20 flashcards at once" });
      }
      
      // If document ID is provided, verify ownership
      if (documentId) {
        const document = await storage.getDocumentById(documentId);
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied to the document" });
        }
      }
      
      // Validate each flashcard
      const validatedFlashcards = [];
      for (let i = 0; i < flashcards.length; i++) {
        try {
          const flashcardData = insertFlashcardSchema.parse(flashcards[i]);
          validatedFlashcards.push(flashcardData);
        } catch (error) {
          return res.status(400).json({ 
            message: `Invalid flashcard at index ${i}`, 
            error: (error as Error).message 
          });
        }
      }
      
      Logger.debug(LogCategory.SECURITY, 'Bulk flashcard creation started', {
        userId,
        documentId,
        count: validatedFlashcards.length,
      });
      
      // Create all flashcards
      const createdFlashcards = [];
      for (const flashcardData of validatedFlashcards) {
        try {
          const flashcard = await storage.createFlashcard({
            ...flashcardData,
            userId,
            documentId: documentId ?? undefined,
          } as any);
          createdFlashcards.push(flashcard);
        } catch (error) {
          Logger.error(LogCategory.SECURITY, 'Failed to create flashcard in bulk operation', error, {
            userId,
            documentId,
          });
          // Continue creating other flashcards even if one fails
        }
      }
      
      // Update user stats
      const userStats = await storage.getUserStats(userId);
      if (userStats) {
        await storage.updateUserStats(userId, {
          flashcardsCreated: (userStats.flashcardsCreated || 0) + createdFlashcards.length,
        });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Bulk flashcard creation completed', {
        userId,
        documentId,
        requestedCount: validatedFlashcards.length,
        createdCount: createdFlashcards.length,
      });
      
      return res.status(201).json({
        message: `Successfully created ${createdFlashcards.length} flashcards`,
        flashcards: createdFlashcards,
        count: createdFlashcards.length,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get flashcard analytics
  app.get('/api/flashcards/analytics', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      
      // Check cache first (5-minute TTL)
      const cacheKey = `flashcard_analytics_${userId}`;
      const cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      const cached = analyticsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < cacheTTL) {
        return res.status(200).json({
          message: "Analytics retrieved successfully",
          analytics: cached.data,
          cached: true,
        });
      }
      
      // Fetch all user flashcards (no pagination for analytics)
      const { flashcards } = await storage.getFlashcardsByUserId(userId);
      
      // Fetch user stats
      const userStats = await storage.getUserStats(userId);
      
      // Calculate analytics
      const { calculateFlashcardAnalytics } = await import('./utils/flashcardAnalytics');
      const analytics = calculateFlashcardAnalytics(flashcards, userStats);
      
      // Cache the result
      analyticsCache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now(),
      });
      
      return res.status(200).json({
        message: "Analytics retrieved successfully",
        analytics,
        cached: false,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Export flashcards in various formats
  app.get('/api/flashcards/export', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const format = (req.query.format as string)?.toLowerCase() || 'json';
      
      // Validate format
      const validFormats = ['csv', 'json', 'anki'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({ 
          message: "Invalid format. Supported formats: csv, json, anki" 
        });
      }
      
      // Fetch all user flashcards (no pagination for export)
      const { flashcards } = await storage.getFlashcardsByUserId(userId);
      
      if (flashcards.length === 0) {
        return res.status(404).json({ 
          message: "No flashcards found to export" 
        });
      }
      
      // Import export utilities
      const { convertToCSV, convertToJSON, convertToAnki } = await import('./utils/flashcardExport');
      
      let content: string;
      let contentType: string;
      let fileExtension: string;
      
      // Convert to requested format
      switch (format) {
        case 'csv':
          content = convertToCSV(flashcards);
          contentType = 'text/csv';
          fileExtension = 'csv';
          break;
        case 'anki':
          content = convertToAnki(flashcards);
          contentType = 'text/plain';
          fileExtension = 'txt';
          break;
        case 'json':
        default:
          content = convertToJSON(flashcards);
          contentType = 'application/json';
          fileExtension = 'json';
          break;
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `flashcards_export_${timestamp}.${fileExtension}`;
      
      // Set headers for file download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.status(200).send(content);
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== MCQ Endpoints =====
  
  // Create MCQ
  app.post('/api/mcqs', jwtAuth, async (req: Request, res: Response) => {
    try {
      const mcqData = insertMcqSchema.parse(req.body);
      const userId = req.user?.userId!;
      
      // If document ID is provided, check if document exists and belongs to user
      if (mcqData.documentId) {
        const document = await storage.getDocumentById(mcqData.documentId);
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied to the document" });
        }
      }
      
      const mcq = await storage.createMcq({
        ...mcqData,
        userId: userId!,
        documentId: mcqData.documentId ?? undefined
      } as any);
      
      return res.status(201).json({
        message: "MCQ created successfully",
        mcq
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get MCQs by document ID, difficulty, or all user MCQs (with pagination)
  app.get('/api/mcqs', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const documentId = req.query.documentId ? parseInt(req.query.documentId as string) : null;
      const difficulty = req.query.difficulty as string | null;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (documentId) {
        // Check if document belongs to user
        const document = await storage.getDocumentById(documentId);
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied to the document" });
        }
        
        // For document-specific queries, return all (no pagination)
        const mcqs = await storage.getMcqsByDocumentId(documentId);
        return res.status(200).json({ mcqs });
      } else if (difficulty) {
        // For difficulty queries, return all (no pagination)
        const mcqs = await storage.getMcqsByDifficulty(userId, difficulty);
        return res.status(200).json({ mcqs });
      } else {
        // For user queries, use pagination
        const result = await storage.getMcqsByUserId(userId, page, limit);
        return res.status(200).json(result);
      }
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update MCQ
  app.patch('/api/mcqs/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const mcqId = parseInt(req.params.id);
      const mcq = await storage.getMcqById(mcqId);
      
      if (!mcq) {
        return res.status(404).json({ message: "MCQ not found" });
      }
      
      // Check if MCQ belongs to the user
      if (mcq.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedMcq = await storage.updateMcq(mcqId, req.body);
      
      return res.status(200).json({
        message: "MCQ updated successfully",
        mcq: updatedMcq
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Delete MCQ
  app.delete('/api/mcqs/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const mcqId = parseInt(req.params.id);
      const mcq = await storage.getMcqById(mcqId);
      
      if (!mcq) {
        return res.status(404).json({ message: "MCQ not found" });
      }
      
      // Check if MCQ belongs to the user
      if (mcq.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteMcq(mcqId);
      
      return res.status(200).json({ message: "MCQ deleted successfully" });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Generate MCQ with AI
  app.post('/api/mcqs/generate', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { topic, difficulty, context } = req.body;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }
      
      // Import and use the Gemini service
      const { geminiService } = await import('./services/gemini');
      
      let mcqData;
      try {
        mcqData = await geminiService.generateMCQ(topic, difficulty || 'medium', context, req.user?.userId);
      } catch (error) {
        console.error("Error generating MCQ:", error);
        return res.status(500).json({ message: "Failed to generate MCQ" });
      }
      
      // Transform the response to match the frontend format
      const options = mcqData.options.map((text: string, index: number) => ({
        id: (index + 1).toString(),
        text: text,
        isCorrect: index === mcqData.correctOption
      }));
      
      return res.status(200).json({
        message: "MCQ generated successfully",
        question: mcqData.question,
        options: options,
        explanation: mcqData.explanation,
        category: "general",
        difficulty: difficulty || "medium"
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Save quiz attempt
  app.post('/api/quiz-attempts', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { score, totalQuestions, correctAnswers, wrongAnswers, timeSpent, category, difficulty, questionsData } = req.body;
      const userId = req.user?.userId!;
      
      // Save quiz attempt to database
      const attempt = await storage.createQuizAttempt({
        userId,
        score,
        totalQuestions,
        correctAnswers,
        timeSpent,
        category: category || 'general',
        difficulty: difficulty || 'medium',
        questionsData: questionsData || null,
        completed: true
      });
      
      // Update user stats
      const userStats = await storage.getUserStats(userId);
      if (userStats) {
        const newQuizzesCompleted = (userStats.quizzesCompleted || 0) + 1;
        const newTotalScore = (userStats.totalQuizScore || 0) + score;
        await storage.updateUserStats(userId, {
          quizzesCompleted: newQuizzesCompleted,
          totalQuizScore: newTotalScore,
          averageScore: Math.round(newTotalScore / newQuizzesCompleted)
        });
      }
      
      return res.status(201).json({
        message: "Quiz attempt saved successfully",
        attempt
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Get quiz statistics
  app.get('/api/quiz-attempts/stats', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const stats = await storage.getQuizStatsByUserId(userId);
      
      return res.status(200).json({ stats });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Get quiz attempts history
  app.get('/api/quiz-attempts', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const attempts = await storage.getQuizAttemptsByUserId(userId, limit);
      
      return res.status(200).json({ attempts });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // ===== Quiz Endpoints =====
  
  // Generate quiz from documents or topics
  app.post('/api/quizzes/generate', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { topic, documentId, numberOfQuestions, difficulty } = req.body;
      const userId = req.user?.userId!;
      
      if (!topic && !documentId) {
        return res.status(400).json({ message: "Either topic or documentId is required" });
      }
      
      let contextText = topic || '';
      
      // If documentId is provided, fetch the document content
      if (documentId) {
        const document = await storage.getDocumentById(parseInt(documentId));
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        // Check if document belongs to the user
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        contextText = document.content || document.title || '';
      }
      
      if (!contextText) {
        return res.status(400).json({ message: "No content available to generate quiz" });
      }
      
      // Import and use the Gemini service
      const { geminiService } = await import('./services/gemini');
      
      const numQuestions = numberOfQuestions || 5;
      const quizDifficulty = difficulty || 'medium';
      const questions = [];
      
      // Generate multiple MCQs
      for (let i = 0; i < numQuestions; i++) {
        try {
          const mcqData = await geminiService.generateMCQ(contextText, quizDifficulty, `Question ${i + 1} of ${numQuestions}`, userId);
          
          // Transform the response to match the frontend format
          const options = mcqData.options.map((text: string, index: number) => ({
            id: (index + 1).toString(),
            text: text,
            isCorrect: index === mcqData.correctOption
          }));
          
          questions.push({
            question: mcqData.question,
            options: options,
            explanation: mcqData.explanation,
            category: "generated",
            difficulty: quizDifficulty
          });
        } catch (error) {
          console.error(`Error generating question ${i + 1}:`, error);
        }
      }
      
      if (questions.length === 0) {
        return res.status(500).json({ message: "Failed to generate quiz questions" });
      }
      
      return res.status(200).json({
        message: "Quiz generated successfully",
        questions,
        topic: topic || "Document-based quiz",
        difficulty: quizDifficulty
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Submit quiz and calculate score
  app.post('/api/quizzes/submit', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { questions, answers, timeSpent } = req.body;
      const userId = req.user?.userId!;
      
      if (!questions || !Array.isArray(questions) || !answers) {
        return res.status(400).json({ message: "Invalid quiz submission data" });
      }
      
      // Calculate score
      let correctAnswers = 0;
      let wrongAnswers = 0;
      const results: Array<{
        questionIndex: number;
        question: string;
        userAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        explanation: string;
      }> = [];
      
      questions.forEach((question: any, index: number) => {
        const userAnswer = answers[index];
        const correctOption = question.options.find((opt: any) => opt.isCorrect);
        const isCorrect = userAnswer === correctOption?.id;
        
        if (isCorrect) {
          correctAnswers++;
        } else {
          wrongAnswers++;
        }
        
        results.push({
          questionIndex: index,
          question: question.question,
          userAnswer,
          correctAnswer: correctOption?.id,
          isCorrect,
          explanation: question.explanation
        });
      });
      
      const totalQuestions = questions.length;
      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      
      // Save quiz attempt
      console.log('Quiz submission:', {
        userId,
        score,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        timeSpent
      });
      
      // Update user stats
      const userStats = await storage.getUserStats(userId);
      if (userStats) {
        await storage.updateUserStats(userId, {
          quizzesCompleted: userStats.quizzesCompleted + 1,
          totalQuizScore: (userStats.totalQuizScore || 0) + score
        });
      }
      
      return res.status(200).json({
        message: "Quiz submitted successfully",
        score,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        results
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== Deck Management Endpoints =====
  
  // Create deck
  app.post('/api/decks', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const { name, description, isPublic } = req.body;
      
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "Deck name is required" });
      }
      
      if (name.length > 255) {
        return res.status(400).json({ message: "Deck name must be 255 characters or less" });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Deck creation started', {
        userId,
        name,
      });
      
      const deck = await storage.createDeck({
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: isPublic ?? false,
      });
      
      Logger.debug(LogCategory.SECURITY, 'Deck created successfully', {
        userId,
        deckId: deck.id,
        name: deck.name,
      });
      
      return res.status(201).json({
        message: "Deck created successfully",
        deck,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get all user decks
  app.get('/api/decks', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      
      Logger.debug(LogCategory.SECURITY, 'Fetching user decks', {
        userId,
      });
      
      const decks = await storage.getDecksByUserId(userId);
      
      // Get card count for each deck
      const decksWithCardCount = await Promise.all(
        decks.map(async (deck) => {
          const cards = await storage.getFlashcardsByDeckId(deck.id);
          return {
            ...deck,
            cardCount: cards.length,
          };
        })
      );
      
      Logger.debug(LogCategory.SECURITY, 'User decks fetched successfully', {
        userId,
        count: decksWithCardCount.length,
      });
      
      return res.status(200).json({
        decks: decksWithCardCount,
        count: decksWithCardCount.length,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get deck by ID with cards
  app.get('/api/decks/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const deckId = parseInt(req.params.id);
      
      if (isNaN(deckId)) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Fetching deck with cards', {
        userId,
        deckId,
      });
      
      const deck = await storage.getDeckById(deckId);
      
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      
      // Verify ownership
      if (deck.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this deck" });
      }
      
      // Get all flashcards in this deck
      const cards = await storage.getFlashcardsByDeckId(deckId);
      
      Logger.debug(LogCategory.SECURITY, 'Deck fetched successfully', {
        userId,
        deckId,
        cardCount: cards.length,
      });
      
      return res.status(200).json({
        deck: {
          ...deck,
          cards,
          cardCount: cards.length,
        },
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update deck
  app.patch('/api/decks/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const deckId = parseInt(req.params.id);
      const { name, description, isPublic } = req.body;
      
      if (isNaN(deckId)) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Deck update started', {
        userId,
        deckId,
      });
      
      const deck = await storage.getDeckById(deckId);
      
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      
      // Verify ownership
      if (deck.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this deck" });
      }
      
      // Validate name if provided
      if (name !== undefined) {
        if (!name || name.trim().length === 0) {
          return res.status(400).json({ message: "Deck name cannot be empty" });
        }
        if (name.length > 255) {
          return res.status(400).json({ message: "Deck name must be 255 characters or less" });
        }
      }
      
      // Build update object
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      
      const updatedDeck = await storage.updateDeck(deckId, updateData);
      
      Logger.debug(LogCategory.SECURITY, 'Deck updated successfully', {
        userId,
        deckId,
      });
      
      return res.status(200).json({
        message: "Deck updated successfully",
        deck: updatedDeck,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Delete deck
  app.delete('/api/decks/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const deckId = parseInt(req.params.id);
      
      if (isNaN(deckId)) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Deck deletion started', {
        userId,
        deckId,
      });
      
      const deck = await storage.getDeckById(deckId);
      
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      
      // Verify ownership
      if (deck.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this deck" });
      }
      
      const deleted = await storage.deleteDeck(deckId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete deck" });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Deck deleted successfully', {
        userId,
        deckId,
      });
      
      return res.status(200).json({
        message: "Deck deleted successfully",
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Add card to deck
  app.post('/api/decks/:id/cards', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const deckId = parseInt(req.params.id);
      const { flashcardId, position } = req.body;
      
      if (isNaN(deckId)) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      
      if (!flashcardId || isNaN(flashcardId)) {
        return res.status(400).json({ message: "Valid flashcard ID is required" });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Adding card to deck', {
        userId,
        deckId,
        flashcardId,
      });
      
      // Verify deck exists and user owns it
      const deck = await storage.getDeckById(deckId);
      
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      
      if (deck.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this deck" });
      }
      
      // Verify flashcard exists and user owns it
      const flashcard = await storage.getFlashcardById(flashcardId);
      
      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }
      
      if (flashcard.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this flashcard" });
      }
      
      // Add card to deck
      const deckFlashcard = await storage.addCardToDeck(
        deckId,
        flashcardId,
        position ?? 0
      );
      
      Logger.debug(LogCategory.SECURITY, 'Card added to deck successfully', {
        userId,
        deckId,
        flashcardId,
      });
      
      return res.status(201).json({
        message: "Card added to deck successfully",
        deckFlashcard,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Remove card from deck
  app.delete('/api/decks/:deckId/cards/:cardId', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const deckId = parseInt(req.params.deckId);
      const cardId = parseInt(req.params.cardId);
      
      if (isNaN(deckId)) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      
      if (isNaN(cardId)) {
        return res.status(400).json({ message: "Invalid card ID" });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Removing card from deck', {
        userId,
        deckId,
        cardId,
      });
      
      // Verify deck exists and user owns it
      const deck = await storage.getDeckById(deckId);
      
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      
      if (deck.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this deck" });
      }
      
      // Remove card from deck
      const removed = await storage.removeCardFromDeck(deckId, cardId);
      
      if (!removed) {
        return res.status(404).json({ message: "Card not found in deck" });
      }
      
      Logger.debug(LogCategory.SECURITY, 'Card removed from deck successfully', {
        userId,
        deckId,
        cardId,
      });
      
      return res.status(200).json({
        message: "Card removed from deck successfully",
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== Code Generator Endpoints =====
  
  // Generate code
  app.post('/api/code-generator', jwtAuth, async (req: Request, res: Response) => {
    try {
      const codeData = codeGenerationSchema.parse(req.body);
      const userId = req.user?.userId!;
      
      // Import and use the Gemini service
      const { geminiService } = await import('./services/gemini');
      
      // Generate code using the Gemini service
      let codeResponse;
      try {
        codeResponse = await geminiService.generateCode(
          codeData.problem,
          codeData.language,
          codeData.context,
          userId
        );
      } catch (error) {
        console.error("Error generating code:", error);
        codeResponse = {
          code: `// Error generating code for ${codeData.language}\n// Please try again later`,
          explanation: "There was an error generating the code. Please try a different problem or language."
        };
      }
      
      // Auto-generate tags based on problem description and language
      const autoTags: string[] = [codeData.language];
      if (codeData.difficulty) {
        autoTags.push(codeData.difficulty as string);
      }
      // Extract potential tags from problem description (simple keyword extraction)
      const problemWords = codeData.problem.toLowerCase().match(/\b(algorithm|data structure|sorting|searching|array|string|tree|graph|recursion|dynamic programming|greedy|backtracking|database|api|web|mobile|machine learning|ai)\b/g);
      if (problemWords) {
        autoTags.push(...Array.from(new Set(problemWords)));
      }
      
      const generatedCode = {
        title: `Solution for: ${codeData.problem.substring(0, 30)}...`,
        problem: codeData.problem,
        code: codeResponse.code,
        language: codeData.language,
        explanation: codeResponse.explanation,
        tags: codeData.tags || autoTags
      };
      
      // Save the generated code
      const codeSnippet = await storage.createCodeSnippet({
        ...generatedCode,
        userId
      });
      
      // Update user stats
      const userStats = await storage.getUserStats(userId);
      if (userStats) {
        await storage.updateUserStats(userId, {
          codeSnippetsGenerated: userStats.codeSnippetsGenerated + 1
        });
      }
      
      return res.status(200).json({
        message: "Code generated successfully",
        codeSnippet
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get user's code snippets with optional filtering (with pagination)
  app.get('/api/code-snippets', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const language = req.query.language as string | undefined;
      const tag = req.query.tag as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await storage.getCodeSnippetsByUserId(userId, page, limit);
      let snippets = result.snippets;
      
      // Filter by language if provided
      if (language && language !== 'all') {
        snippets = snippets.filter(snippet => snippet.language === language);
      }
      
      // Filter by tag if provided
      if (tag && tag !== 'all') {
        snippets = snippets.filter(snippet => {
          const tags = Array.isArray(snippet.tags) 
            ? snippet.tags 
            : (typeof snippet.tags === 'string' ? JSON.parse(snippet.tags || '[]') : []);
          return tags.includes(tag);
        });
      }
      
      // Update total and totalPages based on filtered results
      const filteredTotal = snippets.length;
      const filteredTotalPages = Math.ceil(filteredTotal / limit);
      
      return res.status(200).json({
        snippets,
        total: filteredTotal,
        page: result.page,
        totalPages: filteredTotalPages,
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get unique tags from user's code snippets
  app.get('/api/code-snippets/tags', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const snippets = await storage.getCodeSnippetsByUserId(userId);
      
      // Extract all unique tags
      const tagsSet = new Set<string>();
      snippets.snippets.forEach((snippet: any) => {
        const tags = Array.isArray(snippet.tags) 
          ? snippet.tags 
          : (typeof snippet.tags === 'string' ? JSON.parse(snippet.tags || '[]') : []);
        tags.forEach((tag: string) => tagsSet.add(tag));
      });
      
      return res.status(200).json({ tags: Array.from(tagsSet).sort() });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update code snippet (for adding/editing tags and categories)
  app.patch('/api/code-snippets/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const snippetId = parseInt(req.params.id);
      const snippet = await storage.getCodeSnippetById(snippetId);
      
      if (!snippet) {
        return res.status(404).json({ message: "Code snippet not found" });
      }
      
      // Check if snippet belongs to the user
      if (snippet.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedSnippet = await storage.updateCodeSnippet(snippetId, req.body);
      
      return res.status(200).json({
        message: "Code snippet updated successfully",
        snippet: updatedSnippet
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Delete code snippet
  app.delete('/api/code-snippets/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const snippetId = parseInt(req.params.id);
      const snippet = await storage.getCodeSnippetById(snippetId);
      
      if (!snippet) {
        return res.status(404).json({ message: "Code snippet not found" });
      }
      
      // Check if snippet belongs to the user
      if (snippet.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteCodeSnippet(snippetId);
      
      return res.status(200).json({ message: "Code snippet deleted successfully" });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== Study Plan Endpoints =====
  
  // Create study plan
  app.post('/api/study-plans', jwtAuth, async (req: Request, res: Response) => {
    try {
      const planData = insertStudyPlanSchema.parse(req.body);
      const userId = req.user?.userId!;
      
      const plan = await storage.createStudyPlan({
        ...planData,
        userId
      });
      
      return res.status(201).json({
        message: "Study plan created successfully",
        plan
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get user's study plans
  app.get('/api/study-plans', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const plans = await storage.getStudyPlansByUserId(userId);
      
      return res.status(200).json({ plans });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update study plan
  app.patch('/api/study-plans/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const plan = await storage.getStudyPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Study plan not found" });
      }
      
      // Check if plan belongs to the user
      if (plan.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedPlan = await storage.updateStudyPlan(planId, req.body);
      
      return res.status(200).json({
        message: "Study plan updated successfully",
        plan: updatedPlan
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Delete study plan
  app.delete('/api/study-plans/:id', jwtAuth, async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const plan = await storage.getStudyPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Study plan not found" });
      }
      
      // Check if plan belongs to the user
      if (plan.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteStudyPlan(planId);
      
      return res.status(200).json({ message: "Study plan deleted successfully" });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Generate study plan with AI
  app.post('/api/study-plans/generate', jwtAuth, async (req: Request, res: Response) => {
    try {
      const { topic, durationDays, goal } = req.body;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }
      
      const duration = durationDays || 7;
      const studyGoal = goal || `Learn ${topic}`;
      
      // Import and use the Gemini service
      const { geminiService } = await import('./services/gemini');
      
      let planData;
      try {
        planData = await geminiService.generateStudyPlan(topic, duration, studyGoal, req.user?.userId);
      } catch (error) {
        console.error("Error generating study plan:", error);
        return res.status(500).json({ message: "Failed to generate study plan" });
      }
      
      return res.status(200).json({
        message: "Study plan generated successfully",
        ...planData,
        subject: topic,
        difficulty: "medium",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Complete a study plan item
  app.patch('/api/study-plans/:id/items/:itemId/complete', jwtAuth, async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const itemId = req.params.itemId;
      
      const plan = await storage.getStudyPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Study plan not found" });
      }
      
      // Check if plan belongs to the user
      if (plan.userId !== req.user?.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Parse scheduleData from JSON if needed
      let scheduleData = typeof plan.scheduleData === 'string' 
        ? JSON.parse(plan.scheduleData || '[]') 
        : plan.scheduleData;
      
      // Find and update the item in scheduleData
      let itemFound = false;
      if (Array.isArray(scheduleData)) {
        scheduleData = scheduleData.map((day: any) => {
          if (day.tasks && Array.isArray(day.tasks)) {
            day.tasks = day.tasks.map((task: any) => {
              if (task.id === itemId) {
                itemFound = true;
                return { ...task, completed: true };
              }
              return task;
            });
          }
          return day;
        });
      }
      
      if (!itemFound) {
        return res.status(404).json({ message: "Study item not found" });
      }
      
      // Update the study plan with the modified scheduleData
      const updatedPlan = await storage.updateStudyPlan(planId, { scheduleData });
      
      return res.status(200).json({
        message: "Study item completed successfully",
        plan: updatedPlan
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== User Stats Endpoints =====
  
  // Get user stats
  app.get('/api/user-stats', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      let stats = await storage.getUserStats(userId);
      
      if (!stats) {
        stats = await storage.updateUserStats(userId, {});
      }
      
      return res.status(200).json({ stats });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Get personalized study recommendations
  app.get('/api/recommendations', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      
      // Get user stats
      let stats = await storage.getUserStats(userId);
      if (!stats) {
        stats = await storage.updateUserStats(userId, {});
      }
      
      // Get recent quiz attempts (last 10)
      const quizAttempts = await storage.getQuizAttemptsByUserId(userId, 10);
      
      // Import recommendation engine
      const { generateRecommendations, suggestStudyPlanAdjustments } = await import('./utils/studyRecommendations');
      
      // Generate recommendations
      const recommendations = generateRecommendations(
        {
          quizzesCompleted: stats.quizzesCompleted || 0,
          averageScore: stats.averageScore || 0,
          flashcardsReviewed: stats.flashcardsReviewed || 0,
          correctFlashcards: stats.correctFlashcards || 0,
          incorrectFlashcards: stats.incorrectFlashcards || 0,
          totalStudyTime: stats.totalStudyTime || 0,
          streakDays: stats.streakDays || 0,
          documentsUploaded: stats.documentsUploaded || 0,
        },
        quizAttempts.map(attempt => ({
          category: attempt.category,
          difficulty: attempt.difficulty,
          score: attempt.score,
          correctAnswers: attempt.correctAnswers,
          totalQuestions: attempt.totalQuestions,
          createdAt: attempt.createdAt,
        }))
      );
      
      // Generate study plan adjustments
      const adjustments = suggestStudyPlanAdjustments(
        {
          quizzesCompleted: stats.quizzesCompleted || 0,
          averageScore: stats.averageScore || 0,
          flashcardsReviewed: stats.flashcardsReviewed || 0,
          correctFlashcards: stats.correctFlashcards || 0,
          incorrectFlashcards: stats.incorrectFlashcards || 0,
          totalStudyTime: stats.totalStudyTime || 0,
          streakDays: stats.streakDays || 0,
          documentsUploaded: stats.documentsUploaded || 0,
        },
        quizAttempts.map(attempt => ({
          category: attempt.category,
          difficulty: attempt.difficulty,
          score: attempt.score,
          correctAnswers: attempt.correctAnswers,
          totalQuestions: attempt.totalQuestions,
          createdAt: attempt.createdAt,
        }))
      );
      
      return res.status(200).json({ 
        recommendations,
        adjustments,
        stats: {
          quizzesCompleted: stats.quizzesCompleted || 0,
          averageScore: stats.averageScore || 0,
          flashcardAccuracy: stats.flashcardsReviewed > 0 
            ? Math.round(((stats.correctFlashcards || 0) / stats.flashcardsReviewed) * 100)
            : 0,
          streakDays: stats.streakDays || 0,
        }
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // ===== Profile Endpoints =====
  
  // Get user profile
  app.get('/api/profile', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user stats
      let stats = await storage.getUserStats(userId);
      if (!stats) {
        stats = await storage.updateUserStats(userId, {});
      }
      
      // Don't return password
      const { password, verificationToken, verificationOtp, verificationTokenExpiry,
              resetToken, resetOtp, resetTokenExpiry, ...userProfile } = user;
      
      return res.status(200).json({ 
        profile: userProfile,
        stats 
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update user profile
  app.patch('/api/profile', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const { fullName, preferredLanguage, profilePicture } = req.body;
      
      const updatedUser = await storage.updateUser(userId, {
        fullName,
        preferredLanguage,
        profilePicture,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password or sensitive fields
      const { password, verificationToken, verificationOtp, verificationTokenExpiry,
              resetToken, resetOtp, resetTokenExpiry, ...userProfile } = updatedUser;
      
      return res.status(200).json({
        message: "Profile updated successfully",
        profile: userProfile
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Change password
  app.post('/api/profile/change-password', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await storage.updateUser(userId, {
        password: hashedPassword,
      });
      
      // Send password changed email
      try {
        await emailService.sendPasswordChangedEmail(user.email, user.username);
      } catch (emailError) {
        // Email service already logs the error
      }
      
      return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== Settings Endpoints =====
  
  // Get user settings (returns user preferences)
  app.get('/api/settings', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json({
        settings: {
          preferredLanguage: user.preferredLanguage || 'en',
          emailVerified: user.emailVerified,
          email: user.email,
          username: user.username,
        }
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update user settings
  app.patch('/api/settings', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const { preferredLanguage } = req.body;
      
      const updatedUser = await storage.updateUser(userId, {
        preferredLanguage,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json({
        message: "Settings updated successfully",
        settings: {
          preferredLanguage: updatedUser.preferredLanguage,
        }
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Delete account
  app.delete('/api/settings/account', jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId!;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required to delete account" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Password is incorrect" });
      }
      
      // Delete user (cascade will delete all related data)
      await storage.deleteUser(userId);
      
      // Clear JWT cookies
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      
      return res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
