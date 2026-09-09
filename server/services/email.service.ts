import nodemailer, { Transporter } from 'nodemailer';
import { db } from '../db';
import { emailLogs } from '@shared/schema';
import { and, eq, gte } from 'drizzle-orm';
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getPasswordChangedEmailTemplate,
  getContactNotificationTemplate,
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
    } catch (error) {

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
    if (process.env.RESEND_API_KEY) {
      return true;
    }
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
    if (process.env.RESEND_API_KEY) {
      return true;
    }
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

    if (process.env.RESEND_API_KEY) {
      const from = process.env.RESEND_FROM ||
        (process.env.SMTP_FROM_EMAIL && process.env.SMTP_FROM_NAME
          ? `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`
          : 'StudyForge <onboarding@resend.dev>');

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Resend API failed with status ${response.status}`);
      }
      return;
    }

    try {
      await this.transporter!.sendMail({
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject,
        html,
        text,
      });
    } catch (error) {

      throw error;
    }
  }
  /**
   * Send a study reminder email to user
   * 
   * @param userId - The user's ID
   * @param email - The user's email address
   * @param username - The user's username
   * @param planTitle - The title of the study plan
   * @param taskCount - Number of tasks due today
   * @returns Promise<void>
   */
  public async sendStudyReminderEmail(
    userId: number,
    email: string,
    username: string,
    planTitle: string,
    taskCount: number
  ): Promise<void> {
    const emailType = 'study_reminder';
    if (!this.isReady()) {
      const errorMessage = this.getConfigurationErrorMessage();
      await this.recordEmailSent(userId, emailType, email, 'Study Reminder', 'failed', errorMessage);
      return; // Return silently for cron jobs
    }
    const subject = `Study Reminder: ${taskCount} tasks due today in ${planTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .btn { display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Study Reminder</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>You have <strong>${taskCount}</strong> study tasks due today for your study plan <strong>${planTitle}</strong>.</p>
            <p>Stay on track and complete your tasks to earn more XP!</p>
            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:5000'}/study-planner" class="btn">View Study Planner</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from StudyForge.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `
Hello ${username},
You have ${taskCount} study tasks due today for your study plan ${planTitle}.
Stay on track and complete your tasks to earn more XP!
View your study planner: ${process.env.APP_URL || 'http://localhost:5000'}/study-planner
    `;
    try {
      await this.sendEmail(email, subject, html, text);
      await this.recordEmailSent(userId, emailType, email, subject, 'sent');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(userId, emailType, email, subject, 'failed', errorMessage);
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
  /**
   * Send contact form notification to admin
   * 
   * Sends an email notification to admin when someone submits the contact form.
   * 
   * @param name - Sender's name
   * @param email - Sender's email
   * @param subject - Message subject
   * @param message - Message content
   * @param userId - User ID if authenticated (optional)
   * @returns Promise<void>
   */
  public async sendContactNotification(
    name: string,
    email: string,
    subject: string,
    message: string,
    userId?: number
  ): Promise<void> {
    const emailType = 'contact_notification';
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL;
    if (!adminEmail) {

      return;
    }
    // Get email template
    const template = getContactNotificationTemplate(name, email, subject, message, userId);
    const emailSubject = `New Contact Form: ${subject}`;
    try {
      // Send the email to admin
      await this.sendEmail(adminEmail, emailSubject, template.html, template.text);
      // Record successful send
      await this.recordEmailSent(userId || null, emailType, adminEmail, emailSubject, 'sent');
    } catch (error) {
      // Record failed send
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(userId || null, emailType, adminEmail, emailSubject, 'failed', errorMessage);

      // Don't throw error - contact form should still work even if email fails
    }
  }
  /**
   * Send study plan reminder email
   * 
   * Generic method for sending study plan related emails (reminders, alerts, summaries)
   * 
   * @param userId - The user's ID
   * @param email - The user's email address
   * @param subject - Email subject
   * @param htmlContent - HTML content of the email
   * @param textContent - Plain text content of the email
   * @returns Promise<void>
   */
  public async sendStudyPlanEmail(
    userId: number,
    email: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<void> {
    const emailType = 'study_plan_reminder';
    try {
      await this.sendEmail(email, subject, htmlContent, textContent);
      await this.recordEmailSent(userId, emailType, email, subject, 'sent');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(userId, emailType, email, subject, 'failed', errorMessage);

      // Don't throw - reminders should not break the system
    }
  }
  /**
   * Send password reset by admin email
   * Sends temporary password to user when admin resets their password
   */
  public async sendPasswordResetByAdmin(
    email: string,
    username: string,
    tempPassword: string
  ): Promise<void> {
    const emailType = 'admin_password_reset';
    const subject = 'Your Password Has Been Reset - StudyForge';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .password-box { background: #fff; border: 2px solid #4F46E5; padding: 15px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset by Administrator</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>An administrator has reset your password. Your temporary password is:</p>
            <div class="password-box">${tempPassword}</div>
            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <ul>
                <li>This is a temporary password</li>
                <li>Please change it immediately after logging in</li>
                <li>Do not share this password with anyone</li>
                <li>If you did not request this reset, contact support immediately</li>
              </ul>
            </div>
            <p>To change your password:</p>
            <ol>
              <li>Log in with the temporary password above</li>
              <li>Go to your account settings</li>
              <li>Select "Change Password"</li>
              <li>Enter a new secure password</li>
            </ol>
          </div>
          <div class="footer">
            <p>This is an automated message from StudyForge. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `
Password Reset by Administrator
Hello ${username},
An administrator has reset your password. Your temporary password is:
${tempPassword}
⚠️ Important Security Notice:
- This is a temporary password
- Please change it immediately after logging in
- Do not share this password with anyone
- If you did not request this reset, contact support immediately
To change your password:
1. Log in with the temporary password above
2. Go to your account settings
3. Select "Change Password"
4. Enter a new secure password
This is an automated message from StudyForge.
    `;
    try {
      await this.sendEmail(email, subject, html, text);
      await this.recordEmailSent(null, emailType, email, subject, 'sent');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(null, emailType, email, subject, 'failed', errorMessage);
      throw error;
    }
  }
  /**
   * Send email change verification
   */
  public async sendEmailChangeVerification(
    newEmail: string,
    token: string,
    otp: string
  ): Promise<void> {
    const emailType = 'email_change_verification';
    const subject = 'Verify Your New Email Address - StudyForge';
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    const verificationLink = `${appUrl}/verify-email-change?token=${token}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .otp-box { background: #fff; border: 2px solid #4F46E5; padding: 15px; margin: 20px 0; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your New Email</h1>
          </div>
          <div class="content">
            <p>You requested to change your email address. Please verify this new email address to complete the change.</p>
            <p>Your verification code is:</p>
            <div class="otp-box">${otp}</div>
            <p style="text-align: center;">Or click the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </p>
            <p><strong>This code will expire in 24 hours.</strong></p>
            <p>If you did not request this change, please ignore this email or contact support if you're concerned about your account security.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from StudyForge. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `
Verify Your New Email Address
You requested to change your email address. Please verify this new email address to complete the change.
Your verification code is: ${otp}
Or visit: ${verificationLink}
This code will expire in 24 hours.
If you did not request this change, please ignore this email or contact support if you're concerned about your account security.
    `;
    try {
      await this.sendEmail(newEmail, subject, html, text);
      await this.recordEmailSent(null, emailType, newEmail, subject, 'sent');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(null, emailType, newEmail, subject, 'failed', errorMessage);
      throw error;
    }
  }
  /**
   * Send email changed notification to old email
   */
  public async sendEmailChangedNotification(
    oldEmail: string,
    username: string
  ): Promise<void> {
    const emailType = 'email_changed_notification';
    const subject = 'Your Email Address Has Been Changed - StudyForge';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Address Changed</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>This is to confirm that your email address has been successfully changed.</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <p>If you did not make this change, your account may have been compromised. Please contact support immediately.</p>
            </div>
            <p>Your account is now associated with a new email address. All future communications will be sent to your new email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from StudyForge. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `
Email Address Changed
Hello ${username},
This is to confirm that your email address has been successfully changed.
⚠️ Security Notice:
If you did not make this change, your account may have been compromised. Please contact support immediately.
Your account is now associated with a new email address. All future communications will be sent to your new email.
This is an automated message from StudyForge.
    `;
    try {
      await this.sendEmail(oldEmail, subject, html, text);
      await this.recordEmailSent(null, emailType, oldEmail, subject, 'sent');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(null, emailType, oldEmail, subject, 'failed', errorMessage);
      // Don't throw - this is a notification email
    }
  }
  /**
   * Send suspicious activity alert
   */
  public async sendSuspiciousActivityAlert(
    email: string,
    username: string,
    alerts: Array<{ alertType: string; description: string; severity: string }>
  ): Promise<void> {
    const emailType = 'security_alert';
    const subject = '🔒 Security Alert - Unusual Activity Detected - StudyForge';
    const alertsHtml = alerts.map(alert => `
      <div style="background: ${alert.severity === 'high' ? '#FEE2E2' : alert.severity === 'medium' ? '#FEF3C7' : '#E0E7FF'}; 
                  border-left: 4px solid ${alert.severity === 'high' ? '#DC2626' : alert.severity === 'medium' ? '#F59E0B' : '#6366F1'}; 
                  padding: 15px; margin: 10px 0;">
        <strong>${alert.severity.toUpperCase()} Priority:</strong> ${alert.description}
      </div>
    `).join('');
    const alertsText = alerts.map(alert => 
      `${alert.severity.toUpperCase()} Priority: ${alert.description}`
    ).join('\n');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Security Alert</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>We've detected unusual activity on your account:</p>
            ${alertsHtml}
            <p><strong>What should you do?</strong></p>
            <ul>
              <li>Review your recent account activity</li>
              <li>Change your password if you suspect unauthorized access</li>
              <li>Enable two-factor authentication for added security</li>
              <li>Contact support if you need assistance</li>
            </ul>
            <p>If this activity was you, you can safely ignore this message.</p>
          </div>
          <div class="footer">
            <p>This is an automated security alert from StudyForge. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `
🔒 Security Alert - Unusual Activity Detected
Hello ${username},
We've detected unusual activity on your account:
${alertsText}
What should you do?
- Review your recent account activity
- Change your password if you suspect unauthorized access
- Enable two-factor authentication for added security
- Contact support if you need assistance
If this activity was you, you can safely ignore this message.
This is an automated security alert from StudyForge.
    `;
    try {
      await this.sendEmail(email, subject, html, text);
      await this.recordEmailSent(null, emailType, email, subject, 'sent');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(null, emailType, email, subject, 'failed', errorMessage);
      // Don't throw - this is a notification email
    }
  }

  public async sendAdminDirectReply(
    email: string,
    subject: string,
    content: string
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2>StudyForge Support Reply</h2>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
          <p style="white-space: pre-wrap; line-height: 1.6;">${content}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">Thank you for getting in touch with us. If you have any further questions, simply reply to this ticket.</p>
        </div>
      </div>
    `;
    try {
      await this.sendEmail(email, subject, html, content);
      await this.recordEmailSent(null, 'admin_direct_reply', email, subject, 'sent');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(null, 'admin_direct_reply', email, subject, 'failed', errorMessage);
    }
  }

  public async sendBroadcastEmail(
    email: string,
    subject: string,
    content: string
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2>StudyForge Community Announcement</h2>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <div style="white-space: pre-wrap; line-height: 1.7; color: #334155;">${content}</div>
          <hr style="margin: 30px 0 20px; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">You received this announcement as a valued student of StudyForge.</p>
        </div>
      </div>
    `;
    try {
      await this.sendEmail(email, subject, html, content);
      await this.recordEmailSent(null, 'broadcast_announcement', email, subject, 'sent');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.recordEmailSent(null, 'broadcast_announcement', email, subject, 'failed', errorMessage);
    }
  }
}
export const emailService = new EmailService();
