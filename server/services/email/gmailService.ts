import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { IEmailService } from './emailService';
import { Logger, LogCategory } from '../../utils/logger';

/**
 * Production email service using Gmail SMTP
 * Sends HTML emails with professional templates
 */
export class GmailEmailService implements IEmailService {
  private transporter: Transporter;
  private fromEmail: string;

  constructor() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required');
    }

    // Create transporter with Gmail SMTP using port 587 (TLS)
    // Port 587 is more likely to work through firewalls than port 465
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
      tls: {
        rejectUnauthorized: true
      }
    });

    this.fromEmail = process.env.FROM_EMAIL || `Jadoo <${gmailUser}>`;
  }

  async sendWelcomeEmail(to: string, username: string, verificationLink: string, otp: string): Promise<void> {
    try {
      Logger.email('Attempting to send welcome email', {
        action: 'send_welcome_email',
        email: to,
        username,
      });

      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject: 'Welcome to Jadoo - Verify Your Email',
        html: this.getWelcomeEmailTemplate(username, verificationLink, otp),
      });

      Logger.email('Welcome email sent successfully', {
        action: 'send_welcome_email',
        email: to,
        username,
        success: true,
      });

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        Logger.debug(LogCategory.EMAIL, 'Welcome email details', {
          verificationLink,
          hasOtp: true,
        });
      }
    } catch (error) {
      Logger.emailError('Failed to send welcome email', error, {
        action: 'send_welcome_email',
        email: to,
        username,
        success: false,
      });
      // Don't throw - email failures shouldn't block registration
    }
  }

  async sendVerificationEmail(to: string, username: string, verificationLink: string, otp: string): Promise<void> {
    try {
      Logger.email('Attempting to send verification email', {
        action: 'send_verification_email',
        email: to,
        username,
      });

      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject: 'Verify Your Email Address',
        html: this.getVerificationEmailTemplate(username, verificationLink, otp),
      });

      Logger.email('Verification email sent successfully', {
        action: 'send_verification_email',
        email: to,
        username,
        success: true,
      });

      if (process.env.NODE_ENV === 'development') {
        Logger.debug(LogCategory.EMAIL, 'Verification email details', {
          verificationLink,
          hasOtp: true,
        });
      }
    } catch (error) {
      Logger.emailError('Failed to send verification email', error, {
        action: 'send_verification_email',
        email: to,
        username,
        success: false,
      });
    }
  }

  async sendPasswordResetEmail(to: string, username: string, resetLink: string, otp: string): Promise<void> {
    try {
      Logger.email('Attempting to send password reset email', {
        action: 'send_password_reset_email',
        email: to,
        username,
      });

      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject: 'Reset Your Password',
        html: this.getPasswordResetEmailTemplate(username, resetLink, otp),
      });

      Logger.email('Password reset email sent successfully', {
        action: 'send_password_reset_email',
        email: to,
        username,
        success: true,
      });

      if (process.env.NODE_ENV === 'development') {
        Logger.debug(LogCategory.EMAIL, 'Password reset email details', {
          resetLink,
          hasOtp: true,
        });
      }
    } catch (error) {
      Logger.emailError('Failed to send password reset email', error, {
        action: 'send_password_reset_email',
        email: to,
        username,
        success: false,
      });
    }
  }

  async sendPasswordChangedEmail(to: string, username: string): Promise<void> {
    try {
      Logger.email('Attempting to send password changed confirmation', {
        action: 'send_password_changed_email',
        email: to,
        username,
      });

      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject: 'Your Password Has Been Changed',
        html: this.getPasswordChangedEmailTemplate(username),
      });

      Logger.email('Password changed confirmation sent successfully', {
        action: 'send_password_changed_email',
        email: to,
        username,
        success: true,
      });
    } catch (error) {
      Logger.emailError('Failed to send password changed email', error, {
        action: 'send_password_changed_email',
        email: to,
        username,
        success: false,
      });
    }
  }

  private getWelcomeEmailTemplate(username: string, verificationLink: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 16px 0;
              color: #555;
            }
            .button { 
              display: inline-block; 
              padding: 14px 32px; 
              background: #667eea; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              font-weight: 600;
              transition: background 0.3s;
            }
            .button:hover {
              background: #5568d3;
            }
            .otp-box { 
              background: #f8f9ff; 
              border: 2px dashed #667eea; 
              padding: 24px; 
              text-align: center; 
              margin: 24px 0; 
              border-radius: 8px;
            }
            .otp-label {
              font-size: 14px;
              color: #666;
              margin-bottom: 12px;
              font-weight: 500;
            }
            .otp-code { 
              font-size: 36px; 
              font-weight: bold; 
              letter-spacing: 10px; 
              color: #667eea; 
              font-family: 'Courier New', monospace;
              margin: 8px 0;
            }
            .otp-hint {
              margin: 12px 0 0 0;
              color: #666;
              font-size: 13px;
            }
            .divider { 
              text-align: center; 
              margin: 32px 0; 
              color: #999;
              font-size: 14px;
              position: relative;
            }
            .divider::before,
            .divider::after {
              content: '';
              position: absolute;
              top: 50%;
              width: 40%;
              height: 1px;
              background: #ddd;
            }
            .divider::before { left: 0; }
            .divider::after { right: 0; }
            .link-box {
              background: #f9f9f9;
              padding: 16px;
              border-radius: 6px;
              margin: 16px 0;
              word-break: break-all;
              font-size: 13px;
              color: #667eea;
            }
            .footer { 
              text-align: center; 
              padding: 24px 30px;
              background: #f9f9f9;
              color: #666; 
              font-size: 13px;
              border-top: 1px solid #eee;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Jadoo!</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${username}</strong>,</p>
              <p>Thanks for joining Jadoo, your AI-powered study assistant! We're excited to help you on your learning journey.</p>
              
              <p style="margin-top: 24px;"><strong>To get started, please verify your email address:</strong></p>
              
              <p style="font-size: 15px; color: #667eea; font-weight: 600;">Option 1: Click the button</p>
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </div>
              
              <div class="divider">OR</div>
              
              <p style="font-size: 15px; color: #667eea; font-weight: 600;">Option 2: Enter this code</p>
              <div class="otp-box">
                <div class="otp-label">Your verification code:</div>
                <div class="otp-code">${otp}</div>
                <p class="otp-hint">Enter this code on the verification page</p>
              </div>
              
              <div class="warning">
                <strong>⏰ Important:</strong> This verification code and link will expire in 24 hours.
              </div>
              
              <p style="margin-top: 24px; font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
              <div class="link-box">${verificationLink}</div>
              
              <p style="margin-top: 32px; font-size: 14px; color: #888;">If you didn't create an account with Jadoo, you can safely ignore this email.</p>
              
              <p style="margin-top: 24px;">Happy studying!<br><strong>The Jadoo Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Jadoo. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getVerificationEmailTemplate(username: string, verificationLink: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 16px 0;
              color: #555;
            }
            .button { 
              display: inline-block; 
              padding: 14px 32px; 
              background: #667eea; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              font-weight: 600;
            }
            .otp-box { 
              background: #f8f9ff; 
              border: 2px dashed #667eea; 
              padding: 24px; 
              text-align: center; 
              margin: 24px 0; 
              border-radius: 8px;
            }
            .otp-label {
              font-size: 14px;
              color: #666;
              margin-bottom: 12px;
              font-weight: 500;
            }
            .otp-code { 
              font-size: 36px; 
              font-weight: bold; 
              letter-spacing: 10px; 
              color: #667eea; 
              font-family: 'Courier New', monospace;
              margin: 8px 0;
            }
            .otp-hint {
              margin: 12px 0 0 0;
              color: #666;
              font-size: 13px;
            }
            .divider { 
              text-align: center; 
              margin: 32px 0; 
              color: #999;
              font-size: 14px;
              position: relative;
            }
            .divider::before,
            .divider::after {
              content: '';
              position: absolute;
              top: 50%;
              width: 40%;
              height: 1px;
              background: #ddd;
            }
            .divider::before { left: 0; }
            .divider::after { right: 0; }
            .link-box {
              background: #f9f9f9;
              padding: 16px;
              border-radius: 6px;
              margin: 16px 0;
              word-break: break-all;
              font-size: 13px;
              color: #667eea;
            }
            .footer { 
              text-align: center; 
              padding: 24px 30px;
              background: #f9f9f9;
              color: #666; 
              font-size: 13px;
              border-top: 1px solid #eee;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${username}</strong>,</p>
              <p>You requested a new verification email for your Jadoo account. Please verify your email address to continue:</p>
              
              <p style="margin-top: 24px; font-size: 15px; color: #667eea; font-weight: 600;">Option 1: Click the button</p>
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </div>
              
              <div class="divider">OR</div>
              
              <p style="font-size: 15px; color: #667eea; font-weight: 600;">Option 2: Enter this code</p>
              <div class="otp-box">
                <div class="otp-label">Your verification code:</div>
                <div class="otp-code">${otp}</div>
                <p class="otp-hint">Enter this code on the verification page</p>
              </div>
              
              <div class="warning">
                <strong>⏰ Important:</strong> This verification code and link will expire in 24 hours.
              </div>
              
              <p style="margin-top: 24px; font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
              <div class="link-box">${verificationLink}</div>
              
              <p style="margin-top: 32px; font-size: 14px; color: #888;">If you didn't request this email, you can safely ignore it.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Jadoo. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(username: string, resetLink: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 16px 0;
              color: #555;
            }
            .button { 
              display: inline-block; 
              padding: 14px 32px; 
              background: #667eea; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              font-weight: 600;
            }
            .otp-box { 
              background: #f8f9ff; 
              border: 2px dashed #667eea; 
              padding: 24px; 
              text-align: center; 
              margin: 24px 0; 
              border-radius: 8px;
            }
            .otp-label {
              font-size: 14px;
              color: #666;
              margin-bottom: 12px;
              font-weight: 500;
            }
            .otp-code { 
              font-size: 36px; 
              font-weight: bold; 
              letter-spacing: 10px; 
              color: #667eea; 
              font-family: 'Courier New', monospace;
              margin: 8px 0;
            }
            .otp-hint {
              margin: 12px 0 0 0;
              color: #666;
              font-size: 13px;
            }
            .divider { 
              text-align: center; 
              margin: 32px 0; 
              color: #999;
              font-size: 14px;
              position: relative;
            }
            .divider::before,
            .divider::after {
              content: '';
              position: absolute;
              top: 50%;
              width: 40%;
              height: 1px;
              background: #ddd;
            }
            .divider::before { left: 0; }
            .divider::after { right: 0; }
            .link-box {
              background: #f9f9f9;
              padding: 16px;
              border-radius: 6px;
              margin: 16px 0;
              word-break: break-all;
              font-size: 13px;
              color: #667eea;
            }
            .footer { 
              text-align: center; 
              padding: 24px 30px;
              background: #f9f9f9;
              color: #666; 
              font-size: 13px;
              border-top: 1px solid #eee;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 14px;
            }
            .security-notice {
              background: #e3f2fd;
              border-left: 4px solid #2196f3;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${username}</strong>,</p>
              <p>We received a request to reset your password for your Jadoo account. You can reset your password using either of these methods:</p>
              
              <p style="margin-top: 24px; font-size: 15px; color: #667eea; font-weight: 600;">Option 1: Click the button</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              
              <div class="divider">OR</div>
              
              <p style="font-size: 15px; color: #667eea; font-weight: 600;">Option 2: Enter this code</p>
              <div class="otp-box">
                <div class="otp-label">Your password reset code:</div>
                <div class="otp-code">${otp}</div>
                <p class="otp-hint">Enter this code on the password reset page</p>
              </div>
              
              <div class="warning">
                <strong>⏰ Important:</strong> This reset code and link will expire in 1 hour for security reasons.
              </div>
              
              <p style="margin-top: 24px; font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
              <div class="link-box">${resetLink}</div>
              
              <div class="security-notice">
                <strong>🛡️ Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
              </div>
              
              <p style="margin-top: 24px; font-size: 14px; color: #888;">For security reasons, we recommend choosing a strong, unique password.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Jadoo. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordChangedEmailTemplate(username: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 16px 0;
              color: #555;
            }
            .success-box {
              background: #e8f5e9;
              border-left: 4px solid #4caf50;
              padding: 20px;
              margin: 24px 0;
              border-radius: 4px;
            }
            .success-box p {
              margin: 0;
              color: #2e7d32;
              font-weight: 500;
            }
            .security-notice {
              background: #fff3e0;
              border-left: 4px solid #ff9800;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 14px;
            }
            .footer { 
              text-align: center; 
              padding: 24px 30px;
              background: #f9f9f9;
              color: #666; 
              font-size: 13px;
              border-top: 1px solid #eee;
            }
            .timestamp {
              font-size: 13px;
              color: #888;
              margin-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Changed</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${username}</strong>,</p>
              
              <div class="success-box">
                <p>✓ Your password has been successfully changed.</p>
              </div>
              
              <p>This is a confirmation that the password for your Jadoo account was recently changed.</p>
              
              <p class="timestamp">Changed on: ${new Date().toLocaleString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })}</p>
              
              <div class="security-notice">
                <strong>⚠️ Didn't make this change?</strong><br>
                If you didn't change your password, please contact our support team immediately to secure your account.
              </div>
              
              <p style="margin-top: 32px;">You can now log in to your account using your new password.</p>
              
              <p style="margin-top: 24px;">Stay secure!<br><strong>The Jadoo Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Jadoo. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
