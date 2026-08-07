/**
 * Admin Security Service
 * Handles password resets, email changes, login history, and security alerts
 */

import { db } from '../db';
import { users, securityAuditLogs } from '@shared/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { emailService } from './email.service';
import { Logger, LogCategory } from '../utils/logger';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

interface LoginHistoryRecord {
  id: number;
  action: string;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: any;
  createdAt: Date;
}

export interface SuspiciousActivityAlert {
  userId: number;
  alertType: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  metadata: any;
}

class AdminSecurityService {
  /**
   * Admin-initiated password reset for a user
   * Generates a secure temporary password and sends it via email
   */
  async resetUserPassword(adminId: number, userId: number): Promise<string> {
    try {
      // Get user details
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Generate temporary password (12 characters, alphanumeric + special)
      const tempPassword = this.generateSecurePassword();
      
      // Hash the temporary password
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Update user password
      await db.update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Send email with temporary password
      await emailService.sendPasswordResetByAdmin(user.email, user.username, tempPassword);

      // Log the action
      await db.insert(securityAuditLogs).values({
        userId: userId,
        action: 'admin_password_reset',
        status: 'success',
        details: { adminId, resetBy: 'admin' },
        createdAt: new Date()
      });

      Logger.info(LogCategory.SECURITY, `Admin ${adminId} reset password for user ${userId}`);
      return tempPassword;
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Admin password reset failed', error as Error);
      throw new Error('Failed to reset user password');
    }
  }

  /**
   * Get login history for a specific user
   */
  async getUserLoginHistory(userId: number, limit: number = 50): Promise<LoginHistoryRecord[]> {
    try {
      const history = await db
        .select()
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.userId, userId),
            sql`${securityAuditLogs.action} IN ('login', 'logout', 'login_failed', 'token_refresh')`
          )
        )
        .orderBy(desc(securityAuditLogs.createdAt))
        .limit(limit);

      return history as LoginHistoryRecord[];
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to get login history', error as Error);
      throw new Error('Failed to retrieve login history');
    }
  }

  /**
   * Detect suspicious activity patterns and admin security interventions for a user
   */
  async detectSuspiciousActivity(userId: number): Promise<SuspiciousActivityAlert[]> {
    const alerts: SuspiciousActivityAlert[] = [];
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Check for admin sent security alerts or recent password resets in audit logs
      const adminActions = await db
        .select()
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.userId, userId),
            sql`${securityAuditLogs.action} IN ('security_alert_sent', 'admin_password_reset')`,
            gte(securityAuditLogs.createdAt, last30Days)
          )
        )
        .orderBy(desc(securityAuditLogs.createdAt));

      for (const log of adminActions) {
        if (log.action === 'security_alert_sent') {
          const details = (log.details as any) || {};
          alerts.push({
            userId,
            alertType: details.alertType || 'Admin Security Alert',
            description: details.description || 'Security notification issued by administrator.',
            severity: (details.severity === 'high' || details.severity === 'low') ? details.severity : 'medium',
            metadata: { timestamp: log.createdAt, adminSent: true }
          });
        } else if (log.action === 'admin_password_reset') {
          alerts.push({
            userId,
            alertType: 'Administrative Password Reset',
            description: 'Account credentials were reset by an administrator.',
            severity: 'medium',
            metadata: { timestamp: log.createdAt }
          });
        }
      }

      // Check for multiple failed login attempts
      const failedLogins = await db
        .select()
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.userId, userId),
            eq(securityAuditLogs.action, 'login_failed'),
            gte(securityAuditLogs.createdAt, last24Hours)
          )
        );

      if (failedLogins.length >= 5) {
        alerts.push({
          userId,
          alertType: 'multiple_failed_logins',
          description: `${failedLogins.length} failed login attempts in the last 24 hours`,
          severity: 'high',
          metadata: { count: failedLogins.length, timeframe: '24h' }
        });
      }

      // Check for logins from multiple IPs
      const recentLogins = await db
        .select()
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.userId, userId),
            eq(securityAuditLogs.action, 'login'),
            eq(securityAuditLogs.status, 'success'),
            gte(securityAuditLogs.createdAt, last7Days)
          )
        );

      const uniqueIPs = new Set(recentLogins.map((log: any) => log.ipAddress).filter(Boolean));
      if (uniqueIPs.size >= 5) {
        alerts.push({
          userId,
          alertType: 'multiple_ip_addresses',
          description: `Logins from ${uniqueIPs.size} different IP addresses in the last 7 days`,
          severity: 'medium',
          metadata: { ipCount: uniqueIPs.size, timeframe: '7d' }
        });
      }

      // Check for unusual login times (e.g., 2 AM - 5 AM)
      const nightLogins = recentLogins.filter((log: any) => {
        const hour = new Date(log.createdAt).getHours();
        return hour >= 2 && hour <= 5;
      });

      if (nightLogins.length >= 3) {
        alerts.push({
          userId,
          alertType: 'unusual_login_times',
          description: `${nightLogins.length} logins during unusual hours (2 AM - 5 AM)`,
          severity: 'low',
          metadata: { count: nightLogins.length }
        });
      }

      return alerts;
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to detect suspicious activity', error as Error);
      return [];
    }
  }

  /**
   * Send security alert email to user and record in audit log
   */
  async sendSecurityAlert(userId: number, alerts: SuspiciousActivityAlert[]): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user) {
        return;
      }

      for (const alert of alerts) {
        await db.insert(securityAuditLogs).values({
          userId: userId,
          action: 'security_alert_sent',
          status: 'success',
          details: { alertType: alert.alertType, description: alert.description, severity: alert.severity },
          createdAt: new Date()
        });
      }

      if (user.email) {
        await emailService.sendSuspiciousActivityAlert(user.email, user.username, alerts);
      }

      Logger.info(LogCategory.SECURITY, `Security alert sent to user ${userId}`);
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to send security alert', error as Error);
    }
  }

  /**
   * Initiate email change with verification
   */
  async initiateEmailChange(userId: number, newEmail: string): Promise<void> {
    try {
      // Check if email is already in use
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, newEmail))
        .limit(1);

      if (existingUser) {
        throw new Error('Email already in use');
      }

      // Generate verification token and OTP
      const token = crypto.randomBytes(32).toString('hex');
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with pending email change
      await db.update(users)
        .set({
          pendingEmail: newEmail,
          emailChangeToken: token,
          emailChangeOtp: otp,
          emailChangeTokenExpiry: expiry,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Send verification email to new address
      await emailService.sendEmailChangeVerification(newEmail, token, otp);

      Logger.info(LogCategory.SECURITY, `Email change initiated for user ${userId}`);
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to initiate email change', error as Error);
      throw error;
    }
  }

  /**
   * Verify and complete email change
   */
  async verifyEmailChange(userId: number, token: string, otp: string): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.pendingEmail || !user.emailChangeToken || !user.emailChangeOtp) {
        throw new Error('No pending email change');
      }

      if (user.emailChangeTokenExpiry && new Date() > user.emailChangeTokenExpiry) {
        throw new Error('Verification token expired');
      }

      if (user.emailChangeToken !== token || user.emailChangeOtp !== otp) {
        throw new Error('Invalid verification code');
      }

      const oldEmail = user.email;

      // Update email and clear pending change fields
      await db.update(users)
        .set({
          email: user.pendingEmail,
          pendingEmail: null,
          emailChangeToken: null,
          emailChangeOtp: null,
          emailChangeTokenExpiry: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Send confirmation to old email
      await emailService.sendEmailChangedNotification(oldEmail, user.username);

      // Log the action
      await db.insert(securityAuditLogs).values({
        userId,
        action: 'email_changed',
        status: 'success',
        details: { oldEmail, newEmail: user.pendingEmail },
        createdAt: new Date()
      });

      Logger.info(LogCategory.SECURITY, `Email changed for user ${userId}`);
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Failed to verify email change', error as Error);
      throw error;
    }
  }

  /**
   * Generate a secure random password
   */
  private generateSecurePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Bulk suspend users
   */
  async bulkSuspendUsers(adminId: number, userIds: number[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await db.update(users)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(users.id, userId));

        await db.insert(securityAuditLogs).values({
          userId,
          action: 'bulk_suspend',
          status: 'success',
          details: { adminId },
          createdAt: new Date()
        });

        success++;
      } catch (error) {
        failed++;
        Logger.error(LogCategory.SECURITY, `Failed to suspend user ${userId}`, error as Error);
      }
    }

    return { success, failed };
  }

  /**
   * Bulk activate users
   */
  async bulkActivateUsers(adminId: number, userIds: number[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await db.update(users)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(users.id, userId));

        await db.insert(securityAuditLogs).values({
          userId,
          action: 'bulk_activate',
          status: 'success',
          details: { adminId },
          createdAt: new Date()
        });

        success++;
      } catch (error) {
        failed++;
        Logger.error(LogCategory.SECURITY, `Failed to activate user ${userId}`, error as Error);
      }
    }

    return { success, failed };
  }

  /**
   * Bulk delete users
   */
  async bulkDeleteUsers(adminId: number, userIds: number[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await db.delete(users).where(eq(users.id, userId));

        await db.insert(securityAuditLogs).values({
          userId,
          action: 'bulk_delete',
          status: 'success',
          details: { adminId },
          createdAt: new Date()
        });

        success++;
      } catch (error) {
        failed++;
        Logger.error(LogCategory.SECURITY, `Failed to delete user ${userId}`, error as Error);
      }
    }

    return { success, failed };
  }
}

export const adminSecurityService = new AdminSecurityService();
