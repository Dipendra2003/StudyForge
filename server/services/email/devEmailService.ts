import type { IEmailService } from './emailService';
import { Logger } from '../../utils/logger';

/**
 * Development email service that logs emails to console
 * Used in development environment for testing without sending real emails
 */
export class DevEmailService implements IEmailService {
  async sendWelcomeEmail(to: string, username: string, verificationLink: string, otp: string): Promise<void> {
    Logger.email('Sending welcome email (DEV MODE)', {
      action: 'send_welcome_email',
      email: to,
      username,
      mode: 'development',
    });

    console.log('\n' + '='.repeat(60));
    console.log('📧 WELCOME EMAIL');
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Username: ${username}`);
    console.log(`Subject: Welcome to Jadoo - Verify Your Email`);
    console.log('-'.repeat(60));
    console.log(`Verification Link: ${verificationLink}`);
    console.log(`Verification OTP: ${otp}`);
    console.log('='.repeat(60) + '\n');
  }

  async sendVerificationEmail(to: string, username: string, verificationLink: string, otp: string): Promise<void> {
    Logger.email('Sending verification email (DEV MODE)', {
      action: 'send_verification_email',
      email: to,
      username,
      mode: 'development',
    });

    console.log('\n' + '='.repeat(60));
    console.log('📧 VERIFICATION EMAIL');
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Username: ${username}`);
    console.log(`Subject: Verify Your Email Address`);
    console.log('-'.repeat(60));
    console.log(`Verification Link: ${verificationLink}`);
    console.log(`Verification OTP: ${otp}`);
    console.log('='.repeat(60) + '\n');
  }

  async sendPasswordResetEmail(to: string, username: string, resetLink: string, otp: string): Promise<void> {
    Logger.email('Sending password reset email (DEV MODE)', {
      action: 'send_password_reset_email',
      email: to,
      username,
      mode: 'development',
    });

    console.log('\n' + '='.repeat(60));
    console.log('📧 PASSWORD RESET EMAIL');
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Username: ${username}`);
    console.log(`Subject: Reset Your Password`);
    console.log('-'.repeat(60));
    console.log(`Reset Link: ${resetLink}`);
    console.log(`Reset OTP: ${otp}`);
    console.log('='.repeat(60) + '\n');
  }

  async sendPasswordChangedEmail(to: string, username: string): Promise<void> {
    Logger.email('Sending password changed confirmation (DEV MODE)', {
      action: 'send_password_changed_email',
      email: to,
      username,
      mode: 'development',
    });

    console.log('\n' + '='.repeat(60));
    console.log('📧 PASSWORD CHANGED EMAIL');
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Username: ${username}`);
    console.log(`Subject: Your Password Has Been Changed`);
    console.log('-'.repeat(60));
    console.log('Your password was successfully changed.');
    console.log('='.repeat(60) + '\n');
  }
}
