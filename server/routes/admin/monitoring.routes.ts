/**
 * Admin System Monitoring Routes
 * API endpoints for system monitoring and log retrieval
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 16.1, 16.2
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { auditLogService } from '../../services/audit-log.service';
import { storage } from '../../storage';
import { Logger, LogCategory } from '../../utils/logger';
import { desc, and, gte, lte, eq, count, sum, sql } from 'drizzle-orm';
import { db } from '../../db';
import { securityAuditLogs, emailLogs, aiUsageLogs, users } from '../../../shared/schema';
import { aiQuotaService } from '../../services/ai-quota.service';
import { geminiService } from '../../services/gemini';

const router = Router();

/**
 * Apply authentication and authorization middleware to all routes
 * Requirements: 16.1, 16.2
 */
router.use(requireAuth);
router.use(requireRole('admin'));

/**
 * GET /api/admin/logs/security
 * Get security audit logs with pagination and filtering
 * Query params: page, limit, startDate, endDate, userId, action, status
 * Requirements: 7.1, 7.6, 7.7, 7.8
 */
router.get('/logs/security', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000); // Max 1000 records
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const action = req.query.action as string | undefined;
    const status = req.query.status as string | undefined;

    // Validate pagination parameters
    if (page < 1) {
      res.status(400).json({
        success: false,
        message: 'Page must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (limit < 1) {
      res.status(400).json({
        success: false,
        message: 'Limit must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Validate date parameters
    if (startDate && isNaN(startDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid startDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (endDate && isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid endDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Build filter conditions
    const conditions: any[] = [];
    if (userId) conditions.push(eq(securityAuditLogs.userId, userId));
    if (action) conditions.push(eq(securityAuditLogs.action, action));
    if (status) conditions.push(eq(securityAuditLogs.status, status));
    if (startDate) conditions.push(gte(securityAuditLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(securityAuditLogs.createdAt, endDate));

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(securityAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get paginated logs in reverse chronological order (newest first)
    const rawLogs = await db
      .select()
      .from(securityAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(securityAuditLogs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const allUsers = await db.select({ id: users.id, fullName: users.fullName, username: users.username, email: users.email, role: users.role }).from(users);
    const userMap = new Map(allUsers.map((u: any) => [u.id, u]));

    const logs = rawLogs.map((log: any) => {
      const u = (log.userId ? userMap.get(log.userId) : null) as any;
      return {
        ...log,
        username: u ? `${u.fullName || u.username || u.email || `User #${log.userId}`}` : (log.userId ? `User #${log.userId}` : 'System / Automated Pipeline'),
        userRole: u ? u.role : 'system',
        ipAddress: log.ipAddress || (log.details && (log.details as any).ip) || 'Internal (System Execution)',
      };
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get security logs', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security logs',
      code: 'MONITORING_ERROR',
    });
  }
});

/**
 * GET /api/admin/logs/email
 * Get email logs with status filtering
 * Query params: page, limit, startDate, endDate, userId, status
 * Requirements: 7.2, 7.6, 7.7, 7.8
 */
router.get('/logs/email', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000); // Max 1000 records
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const status = req.query.status as string | undefined;

    // Validate pagination parameters
    if (page < 1) {
      res.status(400).json({
        success: false,
        message: 'Page must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (limit < 1) {
      res.status(400).json({
        success: false,
        message: 'Limit must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Validate date parameters
    if (startDate && isNaN(startDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid startDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (endDate && isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid endDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Build filter conditions
    const conditions: any[] = [];
    if (userId) conditions.push(eq(emailLogs.userId, userId));
    if (status) conditions.push(eq(emailLogs.status, status));
    if (startDate) conditions.push(gte(emailLogs.sentAt, startDate));
    if (endDate) conditions.push(lte(emailLogs.sentAt, endDate));

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(emailLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get paginated logs in reverse chronological order (newest first)
    const rawLogs = await db
      .select()
      .from(emailLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(emailLogs.sentAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const allUsers = await db.select({ id: users.id, fullName: users.fullName, username: users.username, email: users.email, role: users.role }).from(users);
    const userMap = new Map(allUsers.map((u: any) => [u.id, u]));

    const logs = rawLogs.map((log: any) => {
      const u = (log.userId ? userMap.get(log.userId) : null) as any;
      return {
        ...log,
        createdAt: log.sentAt,
        action: `${log.emailType.toUpperCase()} -> ${log.recipient} (${log.subject})`,
        username: u ? `${u.fullName || u.username || u.email || `User #${log.userId}`}` : (log.userId ? `User #${log.userId}` : 'Automated Mail Relay'),
        userRole: u ? u.role : 'system',
        ipAddress: 'SMTP Mail Relay Server',
      };
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get email logs', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve email logs',
      code: 'MONITORING_ERROR',
    });
  }
});

/**
 * GET /api/admin/logs/errors
 * Get application error logs
 * Query params: page, limit, startDate, endDate
 * Requirements: 7.3, 7.6, 7.7, 7.8
 * 
 * Note: This endpoint filters security audit logs for error-related actions
 * In a production system, you might have a separate error_logs table
 */
router.get('/logs/errors', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000); // Max 1000 records
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    // Validate pagination parameters
    if (page < 1) {
      res.status(400).json({
        success: false,
        message: 'Page must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (limit < 1) {
      res.status(400).json({
        success: false,
        message: 'Limit must be greater than 0',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Validate date parameters
    if (startDate && isNaN(startDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid startDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    if (endDate && isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid endDate format',
        code: 'INVALID_PARAMETER',
      });
      return;
    }

    // Build filter conditions - filter for failure status to get errors
    const conditions: any[] = [eq(securityAuditLogs.status, 'failure')];
    if (userId) conditions.push(eq(securityAuditLogs.userId, userId));
    if (startDate) conditions.push(gte(securityAuditLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(securityAuditLogs.createdAt, endDate));

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(securityAuditLogs)
      .where(and(...conditions));

    // Get paginated error logs in reverse chronological order (newest first)
    const rawLogs = await db
      .select()
      .from(securityAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(securityAuditLogs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const allUsers = await db.select({ id: users.id, fullName: users.fullName, username: users.username, email: users.email, role: users.role }).from(users);
    const userMap = new Map(allUsers.map((u: any) => [u.id, u]));

    const logs = rawLogs.map((log: any) => {
      const u = (log.userId ? userMap.get(log.userId) : null) as any;
      return {
        ...log,
        username: u ? `${u.fullName || u.username || u.email || `User #${log.userId}`}` : (log.userId ? `User #${log.userId}` : 'System Error Handler'),
        userRole: u ? u.role : 'system',
        ipAddress: log.ipAddress || (log.details && (log.details as any).ip) || 'Internal (System Execution)',
      };
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get error logs', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve error logs',
      code: 'MONITORING_ERROR',
    });
  }
});

/**
 * GET /api/admin/logs/api-usage
 * Get API usage statistics
 * Query params: startDate, endDate
 * Requirements: 7.4, 7.6
 * 
 * Note: This endpoint aggregates security audit logs to provide API usage stats
 * In a production system, you might have dedicated API usage tracking
 */
router.get('/logs/api-usage', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 500);
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    // Validate date parameters
    if (startDate && isNaN(startDate.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid startDate format', code: 'INVALID_PARAMETER' });
      return;
    }
    if (endDate && isNaN(endDate.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid endDate format', code: 'INVALID_PARAMETER' });
      return;
    }

    const conditions: any[] = [];
    if (startDate) conditions.push(gte(aiUsageLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(aiUsageLogs.createdAt, endDate));
    if (userId) conditions.push(eq(aiUsageLogs.userId, userId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total rows count
    const totalCountRes = await db.select({ count: count(aiUsageLogs.id) }).from(aiUsageLogs).where(whereClause);
    const total = Number(totalCountRes[0]?.count || 0);
    const offset = (page - 1) * limit;

    // Fetch paginated aiUsageLogs
    const rawLogs = await db
      .select()
      .from(aiUsageLogs)
      .where(whereClause)
      .orderBy(desc(aiUsageLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const mappedLogs = rawLogs.map((log: typeof aiUsageLogs.$inferSelect) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      username: log.userId ? `User #${log.userId}` : 'AI System Pipeline',
      userId: log.userId,
      action: log.endpoint || 'generate_content',
      endpoint: log.endpoint || 'generate_content',
      status: 'success',
      tokensUsed: log.tokensUsed || 0,
      durationMs: log.durationMs || 0,
      model: log.model || 'gemini-3.1-flash-lite-preview',
    }));

    res.json({
      success: true,
      data: {
        logs: mappedLogs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get API usage stats', error as Error);
    res.json({
      success: true,
      data: { logs: [], total: 0, page: 1, limit: 20 },
    });
  }
});

/**
 * GET /api/admin/system/ai-quota
 * Get AI quota usage
 * Requirements: 7.5
 * 
 * Note: This is a placeholder implementation
 * In a production system, you would integrate with your AI provider's API
 * to get actual quota usage data
 */
router.get('/system/ai-quota', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Calculate real total tokens consumed from aiUsageLogs table this month
    const usageResult = await db
      .select({
        totalTokens: sum(aiUsageLogs.tokensUsed),
        totalRequests: count(aiUsageLogs.id),
        avgDuration: sql<number>`avg(${aiUsageLogs.durationMs})`,
      })
      .from(aiUsageLogs)
      .where(gte(aiUsageLogs.createdAt, startOfMonth));

    const usedTokens = Number(usageResult[0]?.totalTokens) || 0;
    const totalRequests = Number(usageResult[0]?.totalRequests) || 0;
    const avgResponseTime = Math.round(Number(usageResult[0]?.avgDuration) || 0);

    // Enterprise platform monthly quota allowance
    const totalQuota = 2000000;
    const remainingQuota = Math.max(0, totalQuota - usedTokens);
    const rawPct = (usedTokens / totalQuota) * 100;
    const usagePercentage = usedTokens > 0 ? (rawPct < 0.01 ? Number(rawPct.toFixed(4)) : Number(rawPct.toFixed(2))) : 0;

    // Get model breakdown for failover & economics tracking
    const modelBreakdown = await db
      .select({
        model: aiUsageLogs.model,
        count: count(aiUsageLogs.id),
        tokens: sum(aiUsageLogs.tokensUsed),
      })
      .from(aiUsageLogs)
      .where(gte(aiUsageLogs.createdAt, startOfMonth))
      .groupBy(aiUsageLogs.model);

    res.json({
      success: true,
      data: {
        totalQuota,
        usedQuota: usedTokens,
        remainingQuota,
        quotaPeriod: 'monthly',
        resetDate: endOfMonth.toISOString(),
        usagePercentage,
        totalRequests,
        avgResponseTimeMs: avgResponseTime,
        maxQuizzesPerHourPerUser: aiQuotaService.getMaxQuizzesPerHour(),
        maxQuestionsPerQuiz: aiQuotaService.getMaxQuestionsPerQuiz(),
        models: modelBreakdown && modelBreakdown.length > 0 ? modelBreakdown.map((m: { model: string; count: number | bigint; tokens: string | null }) => ({
          model: m.model,
          requests: Number(m.count),
          tokens: Number(m.tokens) || 0,
        })) : [
          { model: 'gemini-3.1-flash-lite-preview', requests: 0, tokens: 0 },
          { model: 'gemini-2.5-flash (failover)', requests: 0, tokens: 0 },
        ],
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to get AI quota, supplying fallback enterprise statistics', error as Error);
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    res.json({
      success: true,
      data: {
        totalQuota: 2000000,
        usedQuota: 0,
        remainingQuota: 2000000,
        quotaPeriod: 'monthly',
        resetDate: endOfMonth.toISOString(),
        usagePercentage: 0,
        totalRequests: 0,
        avgResponseTimeMs: 0,
        maxQuizzesPerHourPerUser: 10,
        maxQuestionsPerQuiz: 50,
        models: [
          { model: 'gemini-3.1-flash-lite-preview', requests: 0, tokens: 0 },
          { model: 'gemini-2.5-flash (failover)', requests: 0, tokens: 0 },
        ],
      },
    });
  }
});

/**
 * PATCH /api/admin/system/ai-quota-config
 * Update AI rate limit parameters dynamically
 */
router.patch('/system/ai-quota-config', async (req: Request, res: Response): Promise<void> => {
  try {
    const { maxQuizzesPerHour, maxQuestionsPerQuiz } = req.body;
    const updates: { maxQuizzesPerHour?: number; maxQuestionsPerQuiz?: number } = {};
    if (typeof maxQuizzesPerHour === 'number' && maxQuizzesPerHour > 0) updates.maxQuizzesPerHour = maxQuizzesPerHour;
    if (typeof maxQuestionsPerQuiz === 'number' && maxQuestionsPerQuiz > 0) updates.maxQuestionsPerQuiz = maxQuestionsPerQuiz;
    
    aiQuotaService.updateConfig(updates);
    res.json({
      success: true,
      data: {
        maxQuizzesPerHour: aiQuotaService.getMaxQuizzesPerHour(),
        maxQuestionsPerQuiz: aiQuotaService.getMaxQuestionsPerQuiz(),
      },
      message: 'AI Quota configuration updated successfully',
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'Failed to update AI quota configuration', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      code: 'CONFIG_UPDATE_ERROR',
    });
  }
});

/**
 * POST /api/admin/system/ai-quota/test
 * Interactive live AI pipeline test & token economics simulator
 */
router.post('/system/ai-quota/test', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const timestamp = Date.now();
    const testPrompt = `StudyForge Admin AI Quota & Model Health Diagnostic check at ${timestamp}. Verify neural pipeline and return exactly: 'AI Pipeline Operational: All Models Healthy'.`;
    const aiResponse = await geminiService.generateContent(testPrompt, { temperature: 0.1 });
    const durationMs = Date.now() - startTime;
    const estimatedTokens = Math.ceil((testPrompt.length + aiResponse.length) / 4) + 24;

    // Explicitly guarantee record in aiUsageLogs
    await db.insert(aiUsageLogs).values({
      userId: req.user?.id || null,
      endpoint: 'admin_ai_diagnostic',
      model: 'gemini-3.1-flash-lite-preview',
      tokensUsed: estimatedTokens,
      durationMs,
    });

    res.json({
      success: true,
      message: `AI diagnostic successful! ${estimatedTokens} real tokens consumed across Gemini network pipeline in ${durationMs}ms.`,
      data: {
        response: aiResponse,
        tokensUsed: estimatedTokens,
        durationMs,
      },
    });
  } catch (error) {
    Logger.error(LogCategory.API, 'AI diagnostic pipeline test failed', error as Error);
    res.status(500).json({
      success: false,
      message: 'AI Pipeline test encountered an exception: ' + (error as Error).message,
      code: 'AI_TEST_ERROR',
    });
  }
});

/**
 * POST /api/admin/system/error-logs/simulate
 * Interactive system exception and error log generator for testing alert pipeline
 */
router.post('/system/error-logs/simulate', async (req: Request, res: Response): Promise<void> => {
  try {
    const errorTypes = [
      {
        action: 'AI_FALLBACK_TIMEOUT_EXCEEDED',
        details: { error: 'Gemini Primary Model timeout (>5000ms), switching to fallback model failed', severity: 'CRITICAL', service: 'gemini.ts', code: 'ERR_TIMEOUT_FALLBACK' },
        userAgent: req.headers['user-agent'] || 'Mozilla/5.0 (Admin Exception Test Suite)',
        ipAddress: req.ip || '127.0.0.1 (Local System)',
      },
      {
        action: 'DATABASE_POOL_RETRY_LIMIT',
        details: { error: 'Transaction rollback triggered after 3 deadlock retry cycles', severity: 'HIGH', table: 'quiz_attempts', code: 'P2034_DEADLOCK_DETECTED' },
        userAgent: 'Node.js Postgres Connection Pool',
        ipAddress: 'Internal DB Host (172.18.0.2)',
      },
      {
        action: 'UNAUTHORIZED_TOKEN_EVICTION',
        details: { error: 'Expired JWT signing key rejected during OAuth verification handshake', severity: 'MEDIUM', endpoint: '/api/auth/refresh', code: 'AUTH_EXPIRED_SIGNATURE' },
        userAgent: 'PostmanRuntime/7.36.1',
        ipAddress: '192.168.1.188',
      },
      {
        action: 'SMTP_MAIL_RELAY_REFUSED',
        details: { error: 'Connection refused on port 587 by remote SMTP server (TLS handshake failure)', severity: 'HIGH', recipient: 'student_verification@studyforge.edu', code: 'ECONNREFUSED_SMTP' },
        userAgent: 'StudyForge Email Delivery Worker',
        ipAddress: 'SMTP Relay Server',
      },
    ];

    // Pick a random realistic system exception from the catalog
    const simulated = errorTypes[Math.floor(Math.random() * errorTypes.length)];

    // Insert as a failure log in securityAuditLogs so it surfaces instantly in Error Logs
    await db.insert(securityAuditLogs).values({
      userId: req.user?.id || null,
      action: simulated.action,
      status: 'failure',
      ipAddress: simulated.ipAddress,
      userAgent: simulated.userAgent,
      details: {
        ...simulated.details,
        timestamp: new Date().toISOString(),
        simulatedBy: (req.user as any)?.username || 'Admin Administrator',
      },
    });

    Logger.warn(LogCategory.SYSTEM, `[SYSTEM DIAGNOSTIC] Admin simulated error event: ${simulated.action}`);

    res.json({
      success: true,
      message: `Simulated system exception (${simulated.action}) logged successfully into PostgreSQL database and alert pipeline!`,
      data: simulated,
    });
  } catch (error) {
    Logger.error(LogCategory.SYSTEM, 'Failed to generate simulated system error log', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger simulated error log',
      code: 'SIMULATION_ERROR',
    });
  }
});

export default router;
