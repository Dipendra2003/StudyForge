import nodemailer, { Transporter } from 'nodemailer';
import { db } from '../db';
import { emailLogs } from '@shared/schema';
import { and, eq, gte } from 'drizzle-orm';
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getPasswordChangedEmailTemplate,
} from './email-templates';

/**
 * EmailService handles all email sending operations with anti-spam safeguards
 * 
 * Features:
 * - SMTP configuration from environment variables
 * - Configuration validation
 * - Graceful handling of missing configuration
 * - Idempotency checks to prevent duplicate emails
 * - Comprehensive logging of all email attempts
 */
export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;
  private readonly IDEMPOTENCY_WINDOW_MINUTES = 5;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter with environment variables
   * Validates configuration and sets up SMTP connection
   */
  private initializeTransporter(): void {
    // Validate configuration first
    if (!this.validateConfiguration()) {
      console.warn('[EmailService] Email service not configured. Email features will be disabled.');
      this.isConfigured = false;
      return;
    }

    try {
      // Create transporter with SMTP configuration from environment
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      this.isConfigured = true;
      console.log('[EmailService] Email service initialized successfully');
    } catch (error) {
      console.error('[EmailService] Failed to initialize email service:', error);
      this.isConfigured = false;
      this.transporter = null;
    }
  }

  /**
   * Validate that all required environment variables are configured
   * 
   * Requirements: 7.1, 7.2, 7.9
   * 
   * @returns true if all required variables are present, false otherwise
   */
  public validateConfiguration(): boolean {
    const requiredVars = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SMTP_FROM_EMAIL',
      'SMTP_FROM_NAME',
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn('[EmailService] Missing required environment variables:', missingVars.join(', '));
      return false;
    }

    return true;
  }

  /**
   * Check if email service is properly configured and ready to send emails
   * 
   * @returns true if service is configured, false otherwise
   */
  public isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Check if a similar email was sent recently to prevent duplicates
   * 
   * Requirements: 7.4
   * 
   * This method implements idempotency by checking if an email of the same type
   * was sent to the same user within the last 5 minutes. This prevents:
   * - Accidental duplicate sends
   * - Email loops
   * - Spam from rapid repeated requests
   * 
   * @param userId - The ID of the user to check
   * @param emailType - The type of email (verification, reset, notification)
   * @returns Promise<boolean> - true if duplicate detected (should NOT send), false if safe to send
   */
  public async checkIdempotency(userId: number, emailType: string): Promise<boolean> {
    try {
      // Calculate the time threshold (5 minutes ago)
      const thresholdTime = new Date();
      thresholdTime.setMinutes(thresholdTime.getMinutes() - this.IDEMPOTENCY_WINDOW_MINUTES);

      // Query email_logs for recent emails of the same type to the same user
      const recentEmails = await db
        .select()
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.userId, userId),
            eq(emailLogs.emailType, emailType),
            gte(emailLogs.sentAt, thresholdTime)
          )
        )
        .limit(1);

      // If we found any recent emails, it's a duplicate
      const isDuplicate = recentEmails.length > 0;

      if (isDuplicate) {
        console.log(
          `[EmailService] Idempotency check: Duplicate email detected for user ${userId}, type ${emailType}. ` +
          `Last sent at ${recentEmails[0].sentAt}. Preventing duplicate send.`
        );
      }

      return isDuplicate;
    } catch (error) {
      // If there's an error checking idempotency, log it but allow the email to proceed
      // This ensures that database issues don't prevent critical emails from being sent
      console.error('[EmailService] Error checking idempotency:', error);
      console.warn('[EmailService] Proceeding with email send despite idempotency check failure');
      return false;
    }
  }

  /**
   * Record an email sending attempt in the database
   * 
   * Requirements: 7.3, 7.7
   * 
   * This method logs all email sending attempts with their status (sent, failed, pending).
   * This provides:
   * - Audit trail for all email communications
   * - Debugging information for failed sends
   * - Data for idempotency checks
   * - Compliance and monitoring capabilities
   * 
   * @param userId - The ID of the user the email is for (optional for system emails)
   * @param emailType - The type of email (verification, reset, notification)
   * @param recipient - The email address of the recipient
   * @param subject - The subject line of the email
   * @param status - The status of the email (sent, failed, pending)
   * @param errorMessage - Optional error message if the send failed
   * @returns Promise<void>
   */
  public async recordEmailSent(
    userId: number | null,
    emailType: string,
    recipient: string,
    subject: string,
    status: 'sent' | 'failed' | 'pending',
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.insert(emailLogs).values({
        userId: userId,
        emailType,
        recipient,
        subject,
        status,
        errorMessage: errorMessage || null,
        sentAt: new Date(),
      });

      console.log(
        `[EmailService] Email log recorded: type=${emailType}, recipient=${recipient}, status=${status}`
      );
    } catch (error) {
      // Log the error but don't throw - we don't want logging failures to break email sending
      console.error('[EmailService] Failed to record email log:', error);
      console.error('[EmailService] Email details:', {
        userId,
        emailType,
        recipient,
        subject,
        status,
        errorMessage,
      });
    }
  }

  /**
   * Get a user-friendly error message when email service is not configured
   * 
   * Requirements: 7.9
   * 
   * @returns Error message without exposing configuration details
   */
  public getConfigurationErrorMessage(): string {
    return 'Email service is currently unavailable. Please contact support if this issue persists.';
  }

  /**
   * Send an email using the configured SMTP transporter
   * 
   * This is a private helper method that handles the actual email sending.
   * All public email methods should use this method internally.
   * 
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param html - HTML version of the email
   * @param text - Plain text version of the email
   * @returns Promise<void>
   * @throws Error if email sending fails
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Email service is not configured');
    }

    try {
      await this.transporter!.sendMail({
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject,
        html,
        text,
      });

      console.log(`[EmailService] Email sent successfully to ${to}`);
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send verification email to user
   * 
   * Requirements: 1.7, 7.5, 7.8
   * 
   * Sends an email with both a verification link and OTP code.
   * Includes idempotency checks and logging.
   * 
   * @param userId - The user's ID
   * @param email - The user's email address
   * @param username - The user's username
   * @param token - Verification token for link
   * @param otp - 6-digit OTP code
   * @returns Promise<void>
   * @throws Error if email service is not configured or sending fails
   */
  public async sendVerificationEmail(
    userId: number,
    email: string,
    username: string,
    token: string,
    otp: string
  ): Promise<void> {
    const emailType = 'verification';

    // Check if email service is configured
    if (!this.isReady()) {
      const errorMessage = this.getConfigurationErrorMessage();
      await this.recordEmailSent(userId, emailType, email, 'Email Verification', 'failed', errorMessage);
      throw new Error(errorMessage);
    }

    // Check idempotency - prevent duplicate emails
    const isDuplicate = await this.checkIdempotency(userId, emailType);
    if (isDuplicate) {
      console.log(`[EmailService] Skipping duplicate verification email for user ${userId}`);
      return;
    }

    // Generate verification link
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    const verificationLink = `${appUrl}/verify-email?token=${token}`;

    // Get email template
    const template = getVerificationEmailTemplate(username, verificationLink, otp, appUrl);

    const subject = 'Verify Your Email - StudyForge';

    try {
      // Send the email
      await this.sendEmail(email, subject, template.html, template.text);

      // Record successful send
      await this.recordEmailSent(userId, emailType, email, subject, 'sent');
    } catch (error) {
      // Record failed send
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(userId, emailType, email, subject, 'failed', errorMessage);
      throw error;
    }
  }

  /**
   * Send password reset email to user
   * 
   * Requirements: 5.5, 7.5, 7.8
   * 
   * Sends an email with both a password reset link and OTP code.
   * Includes idempotency checks and logging.
   * 
   * @param userId - The user's ID
   * @param email - The user's email address
   * @param username - The user's username
   * @param token - Reset token for link
   * @param otp - 6-digit OTP code
   * @returns Promise<void>
   * @throws Error if email service is not configured or sending fails
   */
  public async sendPasswordResetEmail(
    userId: number,
    email: string,
    username: string,
    token: string,
    otp: string
  ): Promise<void> {
    const emailType = 'reset';

    // Check if email service is configured
    if (!this.isReady()) {
      const errorMessage = this.getConfigurationErrorMessage();
      await this.recordEmailSent(userId, emailType, email, 'Password Reset', 'failed', errorMessage);
      throw new Error(errorMessage);
    }

    // Check idempotency - prevent duplicate emails
    const isDuplicate = await this.checkIdempotency(userId, emailType);
    if (isDuplicate) {
      console.log(`[EmailService] Skipping duplicate password reset email for user ${userId}`);
      return;
    }

    // Generate reset link
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // Get email template
    const template = getPasswordResetEmailTemplate(username, resetLink, otp, appUrl);

    const subject = 'Reset Your Password - StudyForge';

    try {
      // Send the email
      await this.sendEmail(email, subject, template.html, template.text);

      // Record successful send
      await this.recordEmailSent(userId, emailType, email, subject, 'sent');
    } catch (error) {
      // Record failed send
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(userId, emailType, email, subject, 'failed', errorMessage);
      throw error;
    }
  }

  /**
   * Send password changed notification email to user
   * 
   * Requirements: 6.9, 7.5, 7.8
   * 
   * Sends a notification email after successful password change.
   * Includes idempotency checks and logging.
   * 
   * @param userId - The user's ID
   * @param email - The user's email address
   * @param username - The user's username
   * @returns Promise<void>
   * @throws Error if email service is not configured or sending fails
   */
  public async sendPasswordChangedEmail(
    userId: number,
    email: string,
    username: string
  ): Promise<void> {
    const emailType = 'notification';

    // Check if email service is configured
    if (!this.isReady()) {
      const errorMessage = this.getConfigurationErrorMessage();
      await this.recordEmailSent(userId, emailType, email, 'Password Changed', 'failed', errorMessage);
      throw new Error(errorMessage);
    }

    // Check idempotency - prevent duplicate emails
    const isDuplicate = await this.checkIdempotency(userId, emailType);
    if (isDuplicate) {
      console.log(`[EmailService] Skipping duplicate password changed email for user ${userId}`);
      return;
    }

    // Get app URL
    const appUrl = process.env.APP_URL || 'http://localhost:5000';

    // Get email template
    const template = getPasswordChangedEmailTemplate(username, appUrl);

    const subject = 'Password Changed - StudyForge';

    try {
      // Send the email
      await this.sendEmail(email, subject, template.html, template.text);

      // Record successful send
      await this.recordEmailSent(userId, emailType, email, subject, 'sent');
    } catch (error) {
      // Record failed send
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(userId, emailType, email, subject, 'failed', errorMessage);
      throw error;
    }
  }
}
