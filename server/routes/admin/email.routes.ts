/**
 * Admin Email Management Routes
 * Handles all contact message management endpoints for admin panel
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 16.1, 16.2
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { Logger, LogCategory } from '../../utils/logger';
import { z } from 'zod';
import { db } from '../../db';
import { contactMessages, users } from '../../../shared/schema';
import { eq, desc, asc, and, sql } from 'drizzle-orm';
import { emailService } from '../../services/email.service';
import { auditLogService } from '../../services/audit-log.service';

const router = Router();

// Apply auth and role middleware to all routes
router.use(requireAuth);
router.use(requireRole('admin'));

/**
 * GET /api/admin/messages
 * Get all contact messages with pagination and filtering
 * Requirements: 8.1, 8.2, 8.3
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50
    const status = req.query.status as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    // Handle status filter
    if (status) {
      if (status === 'resolved') {
        // "resolved" matches both "responded" and "closed"
        conditions.push(
          sql`${contactMessages.status} IN ('responded', 'closed')`
        );
      } else if (['pending', 'read'].includes(status)) {
        conditions.push(eq(contactMessages.status, status));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort column
    const sortColumn = sortBy === 'createdAt' ? contactMessages.createdAt : contactMessages.updatedAt;
    const orderClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contactMessages)
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);

    // Get messages
    const messages = await db
      .select()
      .from(contactMessages)
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get messages', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      code: 'GET_MESSAGES_ERROR',
    });
  }
});

/**
 * GET /api/admin/messages/:id
 * Get single message by ID
 * Requirements: 8.4
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid message ID',
        code: 'INVALID_MESSAGE_ID',
      });
      return;
    }

    const message = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.id, messageId))
      .limit(1);

    if (!message || message.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      data: message[0],
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get message', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve message',
      code: 'GET_MESSAGE_ERROR',
    });
  }
});

/**
 * PATCH /api/admin/messages/:id/status
 * Update message status
 * Requirements: 8.5, 8.6
 */
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid message ID',
        code: 'INVALID_MESSAGE_ID',
      });
      return;
    }

    // Validate status update
    const statusSchema = z.object({
      status: z.enum(['pending', 'read', 'responded', 'closed'], {
        errorMap: () => ({ message: 'Status must be one of: pending, read, responded, closed' }),
      }),
    });

    const validationResult = statusSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Check if message exists
    const existingMessage = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.id, messageId))
      .limit(1);

    if (!existingMessage || existingMessage.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND',
      });
      return;
    }

    // Update message status
    await db
      .update(contactMessages)
      .set({
        status: validationResult.data.status,
        updatedAt: new Date(),
      })
      .where(eq(contactMessages.id, messageId));

    Logger.info(LogCategory.ADMIN, 'Message status updated', {
      messageId,
      newStatus: validationResult.data.status,
      adminId: req.user!.id,
      adminUsername: req.user!.username,
    });

    res.json({
      success: true,
      message: 'Message status updated successfully',
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to update message status', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message status',
      code: 'UPDATE_STATUS_ERROR',
    });
  }
});

/**
 * POST /api/admin/messages/broadcast
 * Broadcast a system-wide announcement newsletter to active users
 */
router.post('/broadcast', async (req: Request, res: Response): Promise<void> => {
  try {
    const { subject, message, targetGroup = 'all' } = req.body;

    if (!subject || !message || !subject.trim() || !message.trim()) {
      res.status(400).json({ success: false, message: 'Subject and announcement text are required' });
      return;
    }

    const activeUsers = await db
      .select({ email: users.email, id: users.id })
      .from(users)
      .where(eq(users.isActive, true))
      .limit(200);

    let sentCount = 0;
    for (const user of activeUsers) {
      if (user.email) {
        await emailService.sendBroadcastEmail(user.email, subject, message);
        sentCount++;
      }
    }

    await auditLogService.logAdminAction({
      adminId: req.user!.id,
      action: 'broadcast_announcement',
      targetType: 'system',
      targetId: 0,
      details: { adminId: req.user!.id, targetType: 'system' as const, adminUsername: req.user!.username, subject, recipientCount: sentCount, targetGroup },
    });

    Logger.info(LogCategory.ADMIN, `Admin broadcasted announcement "${subject}" to ${sentCount} users`);
    res.json({ success: true, message: `Broadcast successfully dispatched to ${sentCount} user(s).`, count: sentCount });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to execute announcement broadcast', error as Error);
    res.status(500).json({ success: false, message: 'Failed to dispatch broadcast announcement' });
  }
});

/**
 * POST /api/admin/messages/:id/reply
 * Send direct reply to a student contact message and mark ticket as responded
 */
router.post('/:id/reply', async (req: Request, res: Response): Promise<void> => {
  try {
    const messageId = parseInt(req.params.id);
    const { replyMessage } = req.body;

    if (isNaN(messageId) || !replyMessage || !replyMessage.trim()) {
      res.status(400).json({ success: false, message: 'Message ID and reply text are required' });
      return;
    }

    const [message] = await db.select().from(contactMessages).where(eq(contactMessages.id, messageId)).limit(1);
    if (!message) {
      res.status(404).json({ success: false, message: 'Contact ticket not found' });
      return;
    }

    await emailService.sendAdminDirectReply(
      message.email,
      `Re: ${message.subject || 'Your Support Request - StudyForge'}`,
      replyMessage
    );

    await db.update(contactMessages).set({ status: 'responded', updatedAt: new Date() }).where(eq(contactMessages.id, messageId));

    await auditLogService.logAdminAction({
      adminId: req.user!.id,
      action: 'ticket_reply',
      targetType: 'content',
      targetId: messageId,
      details: { adminId: req.user!.id, targetType: 'content' as const, adminUsername: req.user!.username, targetEmail: message.email, replyLength: replyMessage.length },
    });

    Logger.info(LogCategory.ADMIN, `Admin replied to contact ticket #${messageId}`);
    res.json({ success: true, message: 'Reply sent successfully and ticket marked as responded.' });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to send reply to message', error as Error);
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
});

export default router;
