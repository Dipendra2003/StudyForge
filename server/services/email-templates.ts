/**
 * Email Templates for Authentication System
 * 
 * This module provides HTML and plain text email templates for:
 * - Email verification
 * - Password reset
 * - Password changed notification
 * 
 * Requirements: 7.5
 * 
 * All templates include:
 * - HTML version with inline CSS for email client compatibility
 * - Plain text fallback
 * - Branding with application name
 * - Clear call-to-action
 */

interface EmailTemplate {
  html: string;
  text: string;
}

/**
 * Generate email verification template
 * 
 * @param username - The user's username
 * @param verificationLink - Full URL for email verification
 * @param otp - 6-digit OTP code
 * @param appUrl - Base application URL
 * @returns EmailTemplate with HTML and text versions
 */
export function getVerificationEmailTemplate(
  username: string,
  verificationLink: string,
  otp: string,
  appUrl: string
): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - StudyForge</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">StudyForge</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Welcome, ${username}!</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Thank you for signing up for StudyForge. To complete your registration and start using your account, please verify your email address.
              </p>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You can verify your email in two ways:
              </p>
              
              <!-- Verification Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${verificationLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- OTP Section -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #4a4a4a; font-size: 14px; font-weight: 600;">
                  Or enter this verification code:
                </p>
                <p style="margin: 0; color: #1a1a1a; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otp}
                </p>
              </div>
              
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This verification link and code will expire in <strong>24 hours</strong>.
              </p>
              
              <p style="margin: 0 0 30px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you didn't create an account with StudyForge, you can safely ignore this email.
              </p>
              
              <!-- Divider -->
              <div style="border-top: 1px solid #e5e7eb; margin: 30px 0;"></div>
              
              <!-- Manual Link -->
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; color: #667eea; font-size: 12px; word-break: break-all;">
                ${verificationLink}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                © ${new Date().getFullYear()} StudyForge. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Welcome to StudyForge!

Hi ${username},

Thank you for signing up for StudyForge. To complete your registration and start using your account, please verify your email address.

You can verify your email in two ways:

1. Click this link:
${verificationLink}

2. Or enter this verification code:
${otp}

This verification link and code will expire in 24 hours.

If you didn't create an account with StudyForge, you can safely ignore this email.

---

© ${new Date().getFullYear()} StudyForge. All rights reserved.
This is an automated message, please do not reply to this email.
  `.trim();

  return { html, text };
}

/**
 * Generate password reset email template
 * 
 * @param username - The user's username
 * @param resetLink - Full URL for password reset
 * @param otp - 6-digit OTP code
 * @param appUrl - Base application URL
 * @returns EmailTemplate with HTML and text versions
 */
export function getPasswordResetEmailTemplate(
  username: string,
  resetLink: string,
  otp: string,
  appUrl: string
): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - StudyForge</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">StudyForge</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hi ${username},
              </p>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password for your StudyForge account. You can reset your password in two ways:
              </p>
              
              <!-- Reset Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- OTP Section -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #4a4a4a; font-size: 14px; font-weight: 600;">
                  Or enter this reset code:
                </p>
                <p style="margin: 0; color: #1a1a1a; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otp}
                </p>
              </div>
              
              <!-- Security Warning -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: 600;">
                  ⚠️ Security Notice
                </p>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                  This password reset link and code will expire in <strong>1 hour</strong> for your security.
                </p>
              </div>
              
              <p style="margin: 0 0 30px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.
              </p>
              
              <!-- Divider -->
              <div style="border-top: 1px solid #e5e7eb; margin: 30px 0;"></div>
              
              <!-- Manual Link -->
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; color: #667eea; font-size: 12px; word-break: break-all;">
                ${resetLink}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                © ${new Date().getFullYear()} StudyForge. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Password Reset Request

Hi ${username},

We received a request to reset your password for your StudyForge account. You can reset your password in two ways:

1. Click this link:
${resetLink}

2. Or enter this reset code:
${otp}

⚠️ SECURITY NOTICE
This password reset link and code will expire in 1 hour for your security.

If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.

---

© ${new Date().getFullYear()} StudyForge. All rights reserved.
This is an automated message, please do not reply to this email.
  `.trim();

  return { html, text };
}

/**
 * Generate password changed notification email template
 * 
 * @param username - The user's username
 * @param appUrl - Base application URL
 * @returns EmailTemplate with HTML and text versions
 */
export function getPasswordChangedEmailTemplate(
  username: string,
  appUrl: string
): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed - StudyForge</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">StudyForge</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Password Successfully Changed</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hi ${username},
              </p>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                This is a confirmation that the password for your StudyForge account has been successfully changed.
              </p>
              
              <!-- Success Icon -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 64px; height: 64px; background-color: #10b981; border-radius: 50%; text-align: center; line-height: 64px;">
                      <span style="color: #ffffff; font-size: 32px;">✓</span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Security Info -->
              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #065f46; font-size: 14px; font-weight: 600;">
                  🔒 Your Account is Secure
                </p>
                <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.6;">
                  All active sessions have been logged out for your security. You'll need to log in again with your new password.
                </p>
              </div>
              
              <!-- Warning Section -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: 600;">
                  ⚠️ Didn't Make This Change?
                </p>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                  If you didn't change your password, please contact our support team immediately to secure your account.
                </p>
              </div>
              
              <!-- Login Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/login" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Log In to Your Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                Thank you for keeping your account secure!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                © ${new Date().getFullYear()} StudyForge. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Password Successfully Changed

Hi ${username},

This is a confirmation that the password for your StudyForge account has been successfully changed.

🔒 YOUR ACCOUNT IS SECURE
All active sessions have been logged out for your security. You'll need to log in again with your new password.

⚠️ DIDN'T MAKE THIS CHANGE?
If you didn't change your password, please contact our support team immediately to secure your account.

Log in to your account: ${appUrl}/login

Thank you for keeping your account secure!

---

© ${new Date().getFullYear()} StudyForge. All rights reserved.
This is an automated message, please do not reply to this email.
  `.trim();

  return { html, text };
}
