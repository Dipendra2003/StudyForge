// Email service interface for sending transactional emails

export interface IEmailService {
  /**
   * Send welcome email with verification link and OTP
   * @param to - Recipient email address
   * @param username - User's username
   * @param verificationLink - URL for email verification
   * @param otp - 6-digit OTP code for manual verification
   */
  sendWelcomeEmail(to: string, username: string, verificationLink: string, otp: string): Promise<void>;

  /**
   * Send email verification reminder with link and OTP
   * @param to - Recipient email address
   * @param username - User's username
   * @param verificationLink - URL for email verification
   * @param otp - 6-digit OTP code for manual verification
   */
  sendVerificationEmail(to: string, username: string, verificationLink: string, otp: string): Promise<void>;

  /**
   * Send password reset email with reset link and OTP
   * @param to - Recipient email address
   * @param username - User's username
   * @param resetLink - URL for password reset
   * @param otp - 6-digit OTP code for manual reset
   */
  sendPasswordResetEmail(to: string, username: string, resetLink: string, otp: string): Promise<void>;

  /**
   * Send password changed confirmation email
   * @param to - Recipient email address
   * @param username - User's username
   */
  sendPasswordChangedEmail(to: string, username: string): Promise<void>;
}
