/**
 * Admin User Management Service
 * Handles user CRUD operations for admin panel
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 18.1
 */

import { db } from '../db/index';
import { users, refreshTokens, quizAttempts, securityAuditLogs, documents, flashcards, mcqs, questions, userStats, chatHistory, codeSnippets, studyPlans } from '../../shared/schema';
import { eq, or, like, desc, count, and, gte, lte, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { auditLogService } from './audit-log.service';
import { jwtService } from './jwt.service';
import { Logger, LogCategory } from '../utils/logger';
import type { User } from '../../shared/schema';

/**
 * Pagination options interface
 */
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Advanced filter options interface
 */
interface AdvancedFilterOptions extends PaginationOptions {
  role?: 'user' | 'admin';
  isActive?: boolean;
  emailVerified?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * User updates interface
 */
interface UserUpdates {
  fullName?: string;
  email?: string;
  role?: 'user' | 'admin';
}

/**
 * Paginated users response interface
 */
interface PaginatedUsers {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Admin user interface (excludes sensitive fields)
 */
interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: Date | null;
  createdAt: Date;
}

/**
 * User activity interface
 */
interface UserActivity {
  loginHistory: LoginRecord[];
  quizAttempts: QuizAttemptSummary[];
  contentCreated: ContentSummary;
  activeSessionsCount?: number;
  gamification?: {
    totalPoints?: number;
    xpPoints?: number;
    level?: number;
    streakDays?: number;
    longestStreak?: number;
  };
}

interface LoginRecord {
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
  status: 'success' | 'failure';
}

interface QuizAttemptSummary {
  id: number;
  score: number;
  totalQuestions: number;
  category: string | null;
  createdAt: Date;
}

interface ContentSummary {
  quizzes: number;
  flashcards: number;
  documents: number;
  questions: number;
  chatMessages?: number;
  codeSnippets?: number;
  studyPlans?: number;
}

class AdminUserService {
  /**
   * Get all users with pagination
   * Requirements: 4.1, 18.1
   */
  async getAllUsers(options: PaginationOptions): Promise<PaginatedUsers> {
    try {
      const { page, limit: requestedLimit, sortBy = 'createdAt', sortOrder = 'desc' } = options;

      // Enforce maximum 50 items per page
      const limit = Math.min(requestedLimit, 50);
      const validatedPage = Math.max(1, page);
      const offset = (validatedPage - 1) * limit;

      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(users);

      // Determine sort column
      const sortColumn = sortBy === 'username' ? users.username :
                        sortBy === 'email' ? users.email :
                        sortBy === 'role' ? users.role :
                        sortBy === 'lastLogin' ? users.lastLogin :
                        users.createdAt;

      // Get paginated users
      const userList = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(sortOrder === 'asc' ? sortColumn : desc(sortColumn))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        users: userList as AdminUser[],
        total,
        page: validatedPage,
        limit,
        totalPages,
      };
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to get all users', error as Error);
      throw new Error('Failed to retrieve users');
    }
  }

  /**
   * Get users with advanced filtering
   * Supports filtering by role, status, email verification, and date range
   */
  async getFilteredUsers(options: AdvancedFilterOptions): Promise<PaginatedUsers> {
    try {
      const { 
        page, 
        limit: requestedLimit, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        role,
        isActive,
        emailVerified,
        dateFrom,
        dateTo
      } = options;

      // Enforce maximum 50 items per page
      const limit = Math.min(requestedLimit, 50);
      const validatedPage = Math.max(1, page);
      const offset = (validatedPage - 1) * limit;

      // Build filter conditions
      const conditions = [];
      
      if (role !== undefined) {
        conditions.push(eq(users.role, role));
      }
      
      if (isActive !== undefined) {
        conditions.push(eq(users.isActive, isActive));
      }
      
      if (emailVerified !== undefined) {
        conditions.push(eq(users.emailVerified, emailVerified));
      }
      
      if (dateFrom) {
        conditions.push(gte(users.createdAt, dateFrom));
      }
      
      if (dateTo) {
        conditions.push(lte(users.createdAt, dateTo));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(users)
        .where(whereClause);

      // Determine sort column
      const sortColumn = sortBy === 'username' ? users.username :
                        sortBy === 'email' ? users.email :
                        sortBy === 'role' ? users.role :
                        sortBy === 'lastLogin' ? users.lastLogin :
                        users.createdAt;

      // Get paginated users
      const userList = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(sortOrder === 'asc' ? sortColumn : desc(sortColumn))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        users: userList as AdminUser[],
        total,
        page: validatedPage,
        limit,
        totalPages,
      };
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to get filtered users', error as Error);
      throw new Error('Failed to retrieve filtered users');
    }
  }

  /**
   * Search users by username or email
   * Requirements: 4.2
   */
  async searchUsers(query: string, options: PaginationOptions): Promise<PaginatedUsers> {
    try {
      const { page, limit: requestedLimit } = options;

      // Enforce maximum 50 items per page
      const limit = Math.min(requestedLimit, 50);
      const validatedPage = Math.max(1, page);
      const offset = (validatedPage - 1) * limit;

      const searchPattern = `%${query}%`;

      // Get total count of matching users
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(users)
        .where(
          or(
            like(users.username, searchPattern),
            like(users.email, searchPattern)
          )
        );

      // Get paginated search results
      const userList = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(
          or(
            like(users.username, searchPattern),
            like(users.email, searchPattern)
          )
        )
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        users: userList as AdminUser[],
        total,
        page: validatedPage,
        limit,
        totalPages,
      };
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to search users', error as Error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Get user activity history
   */
  async getUserActivity(userId: number): Promise<UserActivity> {
    try {
      // Get login history from security audit logs
      const loginLogs = await db
        .select({
          timestamp: securityAuditLogs.createdAt,
          ipAddress: securityAuditLogs.ipAddress,
          userAgent: securityAuditLogs.userAgent,
          status: securityAuditLogs.status,
        })
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.userId, userId),
            or(
              eq(securityAuditLogs.action, 'login'),
              eq(securityAuditLogs.action, 'failed_login')
            )
          )
        )
        .orderBy(desc(securityAuditLogs.createdAt))
        .limit(50);

      const loginHistory: LoginRecord[] = loginLogs.map((log: { timestamp: Date; ipAddress: string | null; userAgent: string | null; status: string }) => ({
        timestamp: log.timestamp,
        ipAddress: log.ipAddress || null,
        userAgent: log.userAgent || null,
        status: log.status as 'success' | 'failure',
      }));

      // Get quiz attempts
      const attempts = await db
        .select({
          id: quizAttempts.id,
          score: quizAttempts.score,
          correctAnswers: quizAttempts.correctAnswers,
          totalQuestions: quizAttempts.totalQuestions,
          category: quizAttempts.category,
          createdAt: quizAttempts.createdAt,
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
        .orderBy(desc(quizAttempts.createdAt))
        .limit(50);

      const quizAttemptsList: QuizAttemptSummary[] = attempts.map((attempt: { id: number; score: number; correctAnswers: number; totalQuestions: number; category: string | null; createdAt: Date }) => ({
        id: attempt.id,
        score: attempt.correctAnswers, // Use correctAnswers for the score display
        totalQuestions: attempt.totalQuestions,
        category: attempt.category || null,
        createdAt: attempt.createdAt,
      }));

      // Get content created counts
      const [documentsCount] = await db
        .select({ value: count() })
        .from(documents)
        .where(eq(documents.userId, userId));

      const [flashcardsCount] = await db
        .select({ value: count() })
        .from(flashcards)
        .where(eq(flashcards.userId, userId));

      // Count quiz attempts instead of mcqs for "Quizzes" metric
      const [quizAttemptsCount] = await db
        .select({ value: count() })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));

      const [questionsCount] = await db
        .select({ value: count() })
        .from(questions)
        .where(eq(questions.userId, userId));

      const [chatCount] = await db
        .select({ value: count() })
        .from(chatHistory)
        .where(eq(chatHistory.userId, userId));

      const [codeCount] = await db
        .select({ value: count() })
        .from(codeSnippets)
        .where(eq(codeSnippets.userId, userId));

      const [planCount] = await db
        .select({ value: count() })
        .from(studyPlans)
        .where(eq(studyPlans.userId, userId));

      const activeSessionsCount = await jwtService.getActiveSessionCount(userId);
      const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
      const [userInfo] = await db.select({ totalPoints: users.totalPoints }).from(users).where(eq(users.id, userId));

      const contentCreated: ContentSummary = {
        quizzes: quizAttemptsCount.value,
        flashcards: flashcardsCount.value,
        documents: documentsCount.value,
        questions: questionsCount.value,
        chatMessages: chatCount?.value || 0,
        codeSnippets: codeCount?.value || 0,
        studyPlans: planCount?.value || 0,
      };

      return {
        loginHistory,
        quizAttempts: quizAttemptsList,
        contentCreated,
        activeSessionsCount,
        gamification: {
          totalPoints: userInfo?.totalPoints || 0,
          xpPoints: stats?.xpPoints || 0,
          level: stats?.level || 1,
          streakDays: stats?.streakDays || 0,
          longestStreak: stats?.longestStreak || 0,
        },
      };
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to get user activity', error as Error);
      throw new Error('Failed to retrieve user activity');
    }
  }

  /**
   * Update user details
   * Requirements: 4.4
   */
  async updateUser(userId: number, updates: UserUpdates, adminId: number, adminUsername: string): Promise<User | undefined> {
    try {
      // Get current user data for audit log
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Update user
      const updatedUser = await storage.updateUser(userId, updates);

      // Log admin action
      await auditLogService.logAdminAction({
        adminId,
        action: 'user_update',
        targetType: 'user',
        targetId: userId,
        details: {
          adminId,
          adminUsername,
          targetType: 'user',
          targetId: userId,
          targetIdentifier: currentUser.username,
          changes: {
            ...(updates.fullName && { fullName: { old: currentUser.fullName, new: updates.fullName } }),
            ...(updates.email && { email: { old: currentUser.email, new: updates.email } }),
            ...(updates.role && { role: { old: currentUser.role, new: updates.role } }),
          },
        },
      });

      Logger.info(LogCategory.ADMIN, 'User updated', {
        adminId,
        userId,
        updates,
      });

      return updatedUser;
    } catch (error) {
      Logger.error(LogCategory.ADMIN, 'Failed to update user', error as Error);
      throw error;
    }
  }

  /**
   * Suspend user account
   * Requirements: 4.5, 4.8
   */
  async suspendUser(userId: number, adminId: number, adminUsername: string): Promise<void> {
    try {
      // Get current user data
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Set isActive to false
      await storage.updateUser(userId, { isActive: false });

      // Revoke all refresh tokens (Requirement 4.8)
      await storage.deleteAllUserRefreshTokens(userId);

      // Log admin action
      await auditLogService.logAdminAction({
        adminId,
        action: 'user_suspend',
        targetType: 'user',
        targetId: userId,
        details: {
          adminId,
          adminUsername,
          targetType: 'user',
          targetId: userId,
          targetIdentifier: currentUser.username,
        },
      });

      Logger.info(LogCategory.ADMIN, 'User suspended', {
        adminId,
        userId,
      });
    } catch (error) {
      Logger.error(LogCategory.ADMIN, 'Failed to suspend user', error as Error);
      throw error;
    }
  }

  /**
   * Activate user account
   * Requirements: 4.6
   */
  async activateUser(userId: number, adminId: number, adminUsername: string): Promise<void> {
    try {
      // Get current user data
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Set isActive to true
      await storage.updateUser(userId, { isActive: true });

      // Log admin action
      await auditLogService.logAdminAction({
        adminId,
        action: 'user_activate',
        targetType: 'user',
        targetId: userId,
        details: {
          adminId,
          adminUsername,
          targetType: 'user',
          targetId: userId,
          targetIdentifier: currentUser.username,
        },
      });

      Logger.info(LogCategory.ADMIN, 'User activated', {
        adminId,
        userId,
      });
    } catch (error) {
      Logger.error(LogCategory.ADMIN, 'Failed to activate user', error as Error);
      throw error;
    }
  }

  /**
   * Delete user permanently
   * Requirements: 4.7
   */
  async deleteUser(userId: number, adminId: number, adminUsername: string): Promise<void> {
    try {
      // Get current user data for audit log
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Delete user (cascade delete will handle related records)
      await storage.deleteUser(userId);

      // Log admin action
      await auditLogService.logAdminAction({
        adminId,
        action: 'user_delete',
        targetType: 'user',
        targetId: userId,
        details: {
          adminId,
          adminUsername,
          targetType: 'user',
          targetId: userId,
          targetIdentifier: currentUser.username,
        },
      });

      Logger.info(LogCategory.ADMIN, 'User deleted', {
        adminId,
        userId,
      });
    } catch (error) {
      Logger.error(LogCategory.ADMIN, 'Failed to delete user', error as Error);
      throw error;
    }
  }

  async unlockUser(userId: number, adminId: number, adminUsername: string): Promise<User | undefined> {
    try {
      // Re-activate user account
      return await this.updateUser(
        userId,
        { role: 'user' }, // Reset role if needed or simply re-enable
        adminId,
        adminUsername
      );
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to unlock user', error as Error);
      throw error;
    }
  }

  async revokeUserSessions(userId: number, adminId: number, adminUsername: string): Promise<void> {
    await jwtService.revokeAllUserTokens(userId);
    await auditLogService.logAdminAction({
      adminId,
      action: 'session_revoke',
      targetType: 'user',
      targetId: userId,
      details: { adminId, adminUsername, targetType: 'user' as const, targetId: userId, reason: 'Revoked all refresh tokens and forced active session eviction' },
    });
    Logger.info(LogCategory.ADMIN, `Revoked active sessions for user ${userId}`);
  }

  async updateUserGamification(userId: number, totalPoints: number, level: number, adminId: number, adminUsername: string): Promise<void> {
    await db.update(users).set({ totalPoints }).where(eq(users.id, userId));
    const [existingStats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    if (existingStats) {
      await db.update(userStats).set({ xpPoints: totalPoints, level }).where(eq(userStats.userId, userId));
    } else {
      await db.insert(userStats).values({ userId, xpPoints: totalPoints, level });
    }
    await auditLogService.logAdminAction({
      adminId,
      action: 'gamification_update',
      targetType: 'user',
      targetId: userId,
      details: { adminId, adminUsername, targetType: 'user' as const, targetId: userId, totalPoints, level },
    });
    Logger.info(LogCategory.ADMIN, `Updated gamification points (${totalPoints}, lvl ${level}) for user ${userId}`);
  }

  async resetRecoveryQuestions(userId: number, adminId: number, adminUsername: string): Promise<void> {
    await db.update(users).set({
      securityQuestion1: null,
      securityAnswer1: null,
      securityQuestion2: null,
      securityAnswer2: null,
    }).where(eq(users.id, userId));
    await auditLogService.logAdminAction({
      adminId,
      action: 'recovery_reset',
      targetType: 'user',
      targetId: userId,
      details: { adminId, adminUsername, targetType: 'user' as const, targetId: userId, reason: 'Reset security recovery questions to unlock recovery enrollment' },
    });
    Logger.info(LogCategory.ADMIN, `Reset security recovery questions for user ${userId}`);
  }
}

// Export singleton instance
export const adminUserService = new AdminUserService();
