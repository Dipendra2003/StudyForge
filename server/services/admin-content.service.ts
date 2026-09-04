/**
 * Admin Content Management Service
 * Handles content CRUD operations for admin panel
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */

import { db } from '../db/index';
import { documents, flashcards, mcqs, questions, users, savedQuizzes, contentFlags, feedback, chatHistory, codeSnippets, studyPlans } from '../../shared/schema';
import { eq, or, like, desc, count, and, gte, lte } from 'drizzle-orm';
import { auditLogService } from './audit-log.service';
import { Logger, LogCategory } from '../utils/logger';

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
 * Content query options interface
 */
interface ContentQueryOptions extends PaginationOptions {
  search?: string;
  userId?: number;
  category?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Content type
 */
type ContentType = string;

/**
 * Paginated content response interface
 */
interface PaginatedContent<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Content item with creator info
 */
interface ContentItemWithCreator {
  id: number;
  userId: number;
  creatorUsername: string;
  createdAt: Date;
  updatedAt?: Date;
  [key: string]: any;
}

class AdminContentService {
  /**
   * Get all quizzes with pagination and filtering
   * Requirements: 5.1, 18.1
   */
  async getAllQuizzes(options: ContentQueryOptions): Promise<PaginatedContent<ContentItemWithCreator>> {
    try {
      const { page, limit: requestedLimit, search, userId, category, startDate, endDate } = options;

      // Enforce maximum 50 items per page (Requirement 18.1)
      const limit = Math.min(requestedLimit, 50);
      const validatedPage = Math.max(1, page);
      const offset = (validatedPage - 1) * limit;

      // Build filter conditions for saved quizzes
      const conditions = [];
      if (userId) conditions.push(eq(savedQuizzes.userId, userId));
      if (category) conditions.push(eq(savedQuizzes.category, category));
      if (search) conditions.push(like(savedQuizzes.title, `%${search}%`));
      if (startDate) conditions.push(gte(savedQuizzes.savedAt, startDate));
      if (endDate) conditions.push(lte(savedQuizzes.savedAt, endDate));

      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(savedQuizzes)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get paginated saved quizzes with creator info
      const quizzes = await db
        .select({
          id: savedQuizzes.id,
          userId: savedQuizzes.userId,
          creatorUsername: users.username,
          title: savedQuizzes.title,
          description: savedQuizzes.description,
          category: savedQuizzes.category,
          difficulty: savedQuizzes.difficulty,
          questionCount: savedQuizzes.questionCount,
          totalQuestions: savedQuizzes.questionCount,
          usageCount: savedQuizzes.questionCount,
          questionTypes: savedQuizzes.questionTypes,
          timedMode: savedQuizzes.timedMode,
          timeLimit: savedQuizzes.timeLimit,
          aiMode: savedQuizzes.aiMode,
          fullscreenMode: savedQuizzes.fullscreenMode,
          createdAt: savedQuizzes.savedAt, // Map savedAt to createdAt for consistency
          updatedAt: savedQuizzes.savedAt,
        })
        .from(savedQuizzes)
        .leftJoin(users, eq(savedQuizzes.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(savedQuizzes.savedAt))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        items: quizzes as ContentItemWithCreator[],
        total,
        page: validatedPage,
        limit,
        totalPages,
      };
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to get all quizzes', error as Error);
      throw new Error('Failed to retrieve quizzes');
    }
  }

  /**
   * Get all flashcards with pagination and filtering
   * Requirements: 5.2, 18.1
   */
  async getAllFlashcards(options: ContentQueryOptions): Promise<PaginatedContent<ContentItemWithCreator>> {
    try {
      const { page, limit: requestedLimit, search, userId, category, startDate, endDate } = options;

      // Enforce maximum 50 items per page
      const limit = Math.min(requestedLimit, 50);
      const validatedPage = Math.max(1, page);
      const offset = (validatedPage - 1) * limit;

      // Build filter conditions
      const conditions = [];
      if (userId) conditions.push(eq(flashcards.userId, userId));
      if (category) conditions.push(eq(flashcards.category, category));
      if (search) {
        conditions.push(
          or(
            like(flashcards.question, `%${search}%`),
            like(flashcards.answer, `%${search}%`)
          )
        );
      }
      if (startDate) conditions.push(gte(flashcards.createdAt, startDate));
      if (endDate) conditions.push(lte(flashcards.createdAt, endDate));

      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(flashcards)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get paginated flashcards with creator info
      const flashcardList = await db
        .select({
          id: flashcards.id,
          userId: flashcards.userId,
          creatorUsername: users.username,
          documentId: flashcards.documentId,
          question: flashcards.question,
          answer: flashcards.answer,
          category: flashcards.category,
          difficulty: flashcards.difficulty,
          createdAt: flashcards.createdAt,
        })
        .from(flashcards)
        .leftJoin(users, eq(flashcards.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(flashcards.createdAt))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        items: flashcardList as ContentItemWithCreator[],
        total,
        page: validatedPage,
        limit,
        totalPages,
      };
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to get all flashcards', error as Error);
      throw new Error('Failed to retrieve flashcards');
    }
  }

  /**
   * Get all documents with pagination and filtering
   * Requirements: 5.3, 18.1
   */
  async getAllDocuments(options: ContentQueryOptions): Promise<PaginatedContent<ContentItemWithCreator>> {
    try {
      const { page, limit: requestedLimit, search, userId, startDate, endDate } = options;

      // Enforce maximum 50 items per page
      const limit = Math.min(requestedLimit, 50);
      const validatedPage = Math.max(1, page);
      const offset = (validatedPage - 1) * limit;

      // Build filter conditions
      const conditions = [];
      if (userId) conditions.push(eq(documents.userId, userId));
      if (search) {
        conditions.push(
          or(
            like(documents.title, `%${search}%`),
            like(documents.content, `%${search}%`)
          )
        );
      }
      if (startDate) conditions.push(gte(documents.createdAt, startDate));
      if (endDate) conditions.push(lte(documents.createdAt, endDate));

      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(documents)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get paginated documents with creator info
      const documentList = await db
        .select({
          id: documents.id,
          userId: documents.userId,
          creatorUsername: users.username,
          title: documents.title,
          fileType: documents.fileType,
          status: documents.status,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .leftJoin(users, eq(documents.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(documents.createdAt))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        items: documentList as ContentItemWithCreator[],
        total,
        page: validatedPage,
        limit,
        totalPages,
      };
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to get all documents', error as Error);
      throw new Error('Failed to retrieve documents');
    }
  }

  /**
   * Get all questions with pagination and filtering
   * Requirements: 5.4, 18.1
   */
  async getAllQuestions(options: ContentQueryOptions): Promise<PaginatedContent<ContentItemWithCreator>> {
    try {
      const { page, limit: requestedLimit, search, userId, category, startDate, endDate } = options;

      // Enforce maximum 50 items per page
      const limit = Math.min(requestedLimit, 50);
      const validatedPage = Math.max(1, page);
      const offset = (validatedPage - 1) * limit;

      // Build filter conditions
      const conditions = [];
      if (userId) conditions.push(eq(questions.userId, userId));
      if (category) conditions.push(eq(questions.category, category));
      if (search) conditions.push(like(questions.question, `%${search}%`));
      if (startDate) conditions.push(gte(questions.createdAt, startDate));
      if (endDate) conditions.push(lte(questions.createdAt, endDate));

      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(questions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get paginated questions with creator info
      const questionList = await db
        .select({
          id: questions.id,
          userId: questions.userId,
          creatorUsername: users.username,
          type: questions.type,
          question: questions.question,
          category: questions.category,
          difficulty: questions.difficulty,
          usageCount: questions.usageCount,
          createdAt: questions.createdAt,
          updatedAt: questions.updatedAt,
        })
        .from(questions)
        .leftJoin(users, eq(questions.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(questions.createdAt))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        items: questionList as ContentItemWithCreator[],
        total,
        page: validatedPage,
        limit,
        totalPages,
      };
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to get all questions', error as Error);
      throw new Error('Failed to retrieve questions');
    }
  }

  /**
   * Create new study content item (Quizzes, Flashcards, Documents, etc.)
   */
  async createContent(
    contentType: ContentType,
    data: any,
    adminId: number,
    adminUsername: string
  ): Promise<any> {
    try {
      let result;
      switch (contentType) {
        case 'quizzes':
        case 'quiz': {
          const [saved] = await db.insert(savedQuizzes).values({
            userId: data.userId || adminId,
            title: data.title || 'Untitled Custom Quiz',
            description: data.description || 'Custom assessment created via Admin Governance.',
            category: data.category || 'General Study',
            difficulty: data.difficulty || 'medium',
            questionCount: Number(data.questionCount) || 20,
            questionTypes: data.questionTypes ? (Array.isArray(data.questionTypes) ? data.questionTypes : [data.questionTypes]) : ['mcq', 'short_answer'],
            timedMode: Boolean(data.timedMode),
            timeLimit: Number(data.timeLimit) || 300,
            aiMode: data.aiMode !== undefined ? Boolean(data.aiMode) : true,
            fullscreenMode: Boolean(data.fullscreenMode),
          }).returning();
          result = saved;
          break;
        }
        case 'flashcards':
        case 'flashcard': {
          const [saved] = await db.insert(flashcards).values({
            userId: data.userId || adminId,
            question: data.question || data.title || 'Sample Flashcard Question',
            answer: data.answer || data.description || 'Sample Flashcard Answer',
            category: data.category || 'General Study',
            difficulty: data.difficulty || 'medium',
          }).returning();
          result = saved;
          break;
        }
        case 'documents':
        case 'document': {
          const [saved] = await db.insert(documents).values({
            userId: data.userId || adminId,
            title: data.title || 'Untitled Document',
            originalName: data.title || 'document.pdf',
            mimeType: 'application/pdf',
            size: Number(data.questionCount || 1) * 1024 * 1024,
            content: data.description || 'Uploaded document content preview.',
            status: 'processed',
          }).returning();
          result = saved;
          break;
        }
        case 'questions':
        case 'question': {
          const [saved] = await db.insert(questions).values({
            userId: data.userId || adminId,
            question: data.title || data.question || 'Sample study question',
            category: data.category || 'General Study',
            difficulty: data.difficulty || 'medium',
          }).returning();
          result = saved;
          break;
        }
        case 'code_snippets':
        case 'code_snippet': {
          const [saved] = await db.insert(codeSnippets).values({
            userId: data.userId || adminId,
            title: data.title || 'Untitled Code Snippet',
            problem: data.description || 'Practice algorithmic problem solving and optimization.',
            code: data.code || '// Sample code snippet\nconsole.log("Hello, World!");',
            language: data.category || data.language || 'typescript',
            explanation: 'Step-by-step logic walkthrough generated via Admin Governance.',
            tags: ['admin', 'sample'],
          }).returning();
          result = saved;
          break;
        }
        case 'study_plans':
        case 'study_plan': {
          const [saved] = await db.insert(studyPlans).values({
            userId: data.userId || adminId,
            title: data.title || 'Enterprise Curriculum & Study Plan',
            description: data.description || 'Comprehensive mastery plan scheduled via Admin Governance.',
            status: 'active',
            completedPercentage: 0,
            startDate: new Date(),
          }).returning();
          result = saved;
          break;
        }
        default:
          throw new Error('Unsupported content creation type: ' + contentType);
      }

      await auditLogService.logAdminAction({
        adminId,
        action: 'content_create' as any,
        targetType: 'content',
        targetId: (result as any)?.id || 0,
        details: { adminId, targetType: 'content', adminUsername, contentType, title: data.title },
      });

      return result;
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to create content item', error as Error);
      throw new Error('Failed to create content: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Seed sample enterprise quizzes into database for testing and governance demonstration
   */
  async seedSampleQuizzes(adminId: number, adminUsername: string): Promise<number> {
    try {
      const sampleQuizzes = [
        {
          userId: adminId,
          title: 'Advanced Kubernetes Architecture & Container Security',
          description: 'Comprehensive proctored assessment covering pod security policies, service meshes (Istio), etcd quorum resilience, and ingress RBAC hardening.',
          category: 'Cloud Security & DevOps',
          difficulty: 'hard',
          questionCount: 45,
          questionTypes: ['mcq', 'fill-blank', 'rearrange'],
          timedMode: true,
          timeLimit: 1800, // 30 mins
          aiMode: true,
          fullscreenMode: true, // Proctored exam
        },
        {
          userId: adminId,
          title: 'Organic Chemistry II: Reaction Mechanisms & Spectroscopy',
          description: 'In-depth review of nucleophilic acyl substitution, Diels-Alder cycloaddition reactions, H-NMR chemical shift diagnostics, and infrared spectroscopy.',
          category: 'Science',
          difficulty: 'hard',
          questionCount: 30,
          questionTypes: ['mcq', 'true-false'],
          timedMode: true,
          timeLimit: 1200, // 20 mins
          aiMode: false, // Verified Database question bank
          fullscreenMode: true,
        },
        {
          userId: adminId,
          title: 'Deep Learning & Neural Network Architectures',
          description: 'Testing backpropagation math, transformers, self-attention equations, vanishing gradients, and GAN loss optimization.',
          category: 'Tech',
          difficulty: 'medium',
          questionCount: 20,
          questionTypes: ['mcq', 'true-false', 'matching'],
          timedMode: false,
          timeLimit: 300,
          aiMode: true,
          fullscreenMode: false,
        },
        {
          userId: adminId,
          title: 'Macroeconomic Principles & Fiscal Policy Strategies',
          description: 'Analysis of central bank interest rates, quantitative easing, Phillips curve dynamics, inflation targeting, and international GDP trade deficits.',
          category: 'General Knowledge',
          difficulty: 'medium',
          questionCount: 25,
          questionTypes: ['mcq', 'matching'],
          timedMode: false,
          timeLimit: 300,
          aiMode: true,
          fullscreenMode: false,
        },
        {
          userId: adminId,
          title: 'Full-Stack TypeScript & Design Patterns Essentials',
          description: 'Evaluating generics, React 19 concurrency hooks, Express Node clustering, PostgreSQL query optimization, and SOLID architectural patterns.',
          category: 'Coding',
          difficulty: 'easy',
          questionCount: 15,
          questionTypes: ['mcq', 'fill-blank', 'rearrange'],
          timedMode: true,
          timeLimit: 600, // 10 mins
          aiMode: true,
          fullscreenMode: false,
        },
      ];

      for (const item of sampleQuizzes) {
        await db.insert(savedQuizzes).values(item);
      }

      await auditLogService.logAdminAction({
        adminId,
        action: 'content_seed' as any,
        targetType: 'content',
        targetId: 0,
        details: { adminId, targetType: 'content', count: sampleQuizzes.length, adminUsername },
      });

      return sampleQuizzes.length;
    } catch (error) {
      Logger.error(LogCategory.DATABASE, 'Failed to seed sample quizzes', error as Error);
      throw new Error('Failed to seed sample quizzes');
    }
  }

  /**
   * Update content item
   * Requirements: 5.5
   */
  async updateContent(
    contentType: ContentType,
    id: number,
    updates: any,
    adminId: number,
    adminUsername: string
  ): Promise<void> {
    try {
      let table;
      let tableName: string;

      // Map content type to table
      switch (contentType) {
        case 'quizzes':
        case 'quiz':
          table = savedQuizzes;
          tableName = 'saved_quizzes';
          break;
        case 'flashcards':
        case 'flashcard':
          table = flashcards;
          tableName = 'flashcards';
          break;
        case 'documents':
        case 'document':
          table = documents;
          tableName = 'documents';
          break;
        case 'questions':
        case 'question':
          table = questions;
          tableName = 'questions';
          break;
        case 'chat_transcripts':
        case 'chat':
          table = chatHistory;
          tableName = 'chat_history';
          break;
        case 'code_snippets':
        case 'code_snippet':
          table = codeSnippets;
          tableName = 'code_snippets';
          break;
        case 'study_plans':
        case 'study_plan':
          table = studyPlans;
          tableName = 'study_plans';
          break;
        case 'flagged':
        case 'flag':
          table = contentFlags;
          tableName = 'content_flags';
          break;
        default:
          throw new Error('Invalid content type: ' + contentType);
      }

      // Sanitize and format data for updates
      if (contentType === 'quizzes' || contentType === 'quiz') {
        if (updates.questionCount !== undefined) updates.questionCount = Number(updates.questionCount);
        if (updates.timeLimit !== undefined) updates.timeLimit = Number(updates.timeLimit);
        if (updates.timedMode !== undefined) updates.timedMode = Boolean(updates.timedMode);
        if (updates.aiMode !== undefined) updates.aiMode = Boolean(updates.aiMode);
        if (updates.fullscreenMode !== undefined) updates.fullscreenMode = Boolean(updates.fullscreenMode);
        if (updates.totalQuestions !== undefined) delete updates.totalQuestions;
        if (updates.usageCount !== undefined) delete updates.usageCount;
        if (updates.creatorUsername !== undefined) delete updates.creatorUsername;
        if (updates.createdAt !== undefined) delete updates.createdAt;
        if (updates.updatedAt !== undefined) delete updates.updatedAt;
      }

      // Update content
      await db.update(table).set(updates).where(eq(table.id, id));

      // Log admin action
      await auditLogService.logAdminAction({
        adminId,
        action: 'content_update',
        targetType: 'content',
        targetId: id,
        details: {
          adminId,
          adminUsername,
          targetType: 'content',
          targetId: id,
          targetIdentifier: `${contentType}:${id}`,
          contentType,
          changes: updates,
        },
      });

      Logger.info(LogCategory.ADMIN, 'Content updated', {
        adminId,
        contentType,
        contentId: id,
      });
    } catch (error) {
      Logger.error(LogCategory.ADMIN, 'Failed to update content', error as Error);
      throw error;
    }
  }

  /**
   * Delete content item
   * Requirements: 5.6, 5.8
   */
  async deleteContent(
    contentType: ContentType,
    id: number,
    adminId: number,
    adminUsername: string
  ): Promise<void> {
    try {
      let table;
      let tableName: string;

      // Map content type to table
      switch (contentType) {
        case 'quizzes':
        case 'quiz':
          table = savedQuizzes;
          tableName = 'saved_quizzes';
          break;
        case 'flashcards':
        case 'flashcard':
          table = flashcards;
          tableName = 'flashcards';
          break;
        case 'documents':
        case 'document':
          table = documents;
          tableName = 'documents';
          break;
        case 'questions':
        case 'question':
          table = questions;
          tableName = 'questions';
          break;
        case 'chat_transcripts':
        case 'chat':
          table = chatHistory;
          tableName = 'chat_history';
          break;
        case 'code_snippets':
        case 'code_snippet':
          table = codeSnippets;
          tableName = 'code_snippets';
          break;
        case 'study_plans':
        case 'study_plan':
          table = studyPlans;
          tableName = 'study_plans';
          break;
        case 'flagged':
        case 'flag':
          table = contentFlags;
          tableName = 'content_flags';
          break;
        default:
          throw new Error('Invalid content type: ' + contentType);
      }

      // Delete content (cascade delete handled by database foreign key constraints)
      await db.delete(table).where(eq(table.id, id));

      // Log admin action
      await auditLogService.logAdminAction({
        adminId,
        action: 'content_delete',
        targetType: 'content',
        targetId: id,
        details: {
          adminId,
          adminUsername,
          targetType: 'content',
          targetId: id,
          targetIdentifier: `${contentType}:${id}`,
          contentType,
        },
      });

      Logger.info(LogCategory.ADMIN, 'Content deleted', {
        adminId,
        contentType,
        contentId: id,
      });
    } catch (error) {
      Logger.error(LogCategory.ADMIN, 'Failed to delete content', error as Error);
      throw error;
    }
  }

  /**
   * Get flagged content
   * Requirements: 5.7
   * Note: This is a placeholder implementation as there's no flagging system in the current schema
   */
  async getFlaggedContent(): Promise<any[]> {
    try {
      let flags: any[] = [];
      try {
        const dbFlags = await db
          .select({
            id: contentFlags.id,
            contentType: contentFlags.contentType,
            contentId: contentFlags.contentId,
            reason: contentFlags.reason,
            status: contentFlags.status,
            createdAt: contentFlags.createdAt,
            reporterUsername: users.username,
          })
          .from(contentFlags)
          .leftJoin(users, eq(contentFlags.userId, users.id))
          .where(eq(contentFlags.status, 'pending'))
          .orderBy(desc(contentFlags.createdAt));
          
        flags = dbFlags.map((f: any) => ({
          ...f,
          title: `Flagged ${f.contentType} (#${f.contentId})`,
          category: f.contentType,
          creatorUsername: f.reporterUsername || 'System AI Scanner',
        }));
      } catch (e) {
        Logger.warn(LogCategory.ADMIN, 'content_flags table query fallback triggered', e as Error);
      }

      let enrichedChatReports: any[] = [];
      try {
        const chatReports = await db
          .select({
            id: feedback.id,
            messageId: feedback.messageId,
            userId: feedback.userId,
            createdAt: feedback.createdAt,
            reporterUsername: users.username,
          })
          .from(feedback)
          .leftJoin(users, eq(feedback.userId, users.id))
          .where(eq(feedback.type, 'report'))
          .orderBy(desc(feedback.createdAt));

        enrichedChatReports = await Promise.all(
          chatReports.map(async (r: any) => {
            let preview = 'Message deleted or inaccessible';
            try {
              const [msg] = await db.select().from(chatHistory).where(eq(chatHistory.id, r.messageId));
              if (msg && msg.messages) {
                preview = Array.isArray(msg.messages) ? JSON.stringify(msg.messages).slice(0, 150) + '...' : String(msg.messages).slice(0, 150) + '...';
              }
            } catch (err) { /* ignore */ }
            return {
              id: r.id,
              contentType: 'chat_message',
              contentId: r.messageId,
              title: `Reported AI Conversation (#${r.messageId})`,
              category: 'User Toxicity Report',
              reason: 'User flagged AI chat interaction as inappropriate',
              status: 'pending',
              createdAt: r.createdAt,
              reporterUsername: r.reporterUsername || 'unknown',
              creatorUsername: r.reporterUsername || 'unknown',
              preview,
            };
          })
        );
      } catch (e) {
        Logger.warn(LogCategory.ADMIN, 'feedback table query fallback triggered', e as Error);
      }

      return [...flags, ...enrichedChatReports];
    } catch (error) {
      Logger.error(LogCategory.ADMIN, 'Failed to get flagged content', error as Error);
      return [];
    }
  }

  async getAllChatHistories(options: ContentQueryOptions): Promise<PaginatedContent<ContentItemWithCreator>> {
    const { page, limit: requestedLimit, search, userId } = options;
    const limit = Math.min(requestedLimit || 50, 50);
    const validatedPage = Math.max(1, page || 1);
    const offset = (validatedPage - 1) * limit;
    const conditions = [];
    if (userId) conditions.push(eq(chatHistory.userId, userId));
    if (search) conditions.push(like(chatHistory.subject, `%${search}%`));
    
    const [{ value: total }] = await db.select({ value: count() }).from(chatHistory).where(conditions.length > 0 ? and(...conditions) : undefined);
    const items = await db.select({
      id: chatHistory.id,
      userId: chatHistory.userId,
      creatorUsername: users.username,
      title: chatHistory.subject,
      sessionId: chatHistory.sessionId,
      messages: chatHistory.messages,
      createdAt: chatHistory.createdAt,
    })
    .from(chatHistory)
    .leftJoin(users, eq(chatHistory.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(chatHistory.createdAt))
    .limit(limit)
    .offset(offset);
    
    const formattedItems = items.map((item: any) => {
      let displayTitle = item.title;
      if (!displayTitle || displayTitle.trim() === '[user]' || displayTitle.trim() === '' || displayTitle === 'New Chat') {
        if (Array.isArray(item.messages) && item.messages.length > 0) {
          const firstMsg = item.messages.find((m: any) => m.role === 'user' || m.content) || item.messages[0];
          if (firstMsg && firstMsg.content) {
            displayTitle = typeof firstMsg.content === 'string' 
              ? (firstMsg.content.length > 55 ? firstMsg.content.slice(0, 55) + '...' : firstMsg.content) 
              : `AI Tutoring Session #${item.id}`;
          }
        } else if (typeof item.messages === 'string') {
          displayTitle = item.messages.length > 55 ? item.messages.slice(0, 55) + '...' : item.messages;
        }
      }
      if (!displayTitle || displayTitle.trim() === '[user]') displayTitle = `AI Tutoring Session #${item.id}`;
      return {
        ...item,
        title: displayTitle,
        category: 'AI Tutoring Conversation',
      };
    });
    
    return { items: formattedItems as unknown as ContentItemWithCreator[], total, page: validatedPage, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAllCodeSnippets(options: ContentQueryOptions): Promise<PaginatedContent<ContentItemWithCreator>> {
    const { page, limit: requestedLimit, search, userId } = options;
    const limit = Math.min(requestedLimit || 50, 50);
    const validatedPage = Math.max(1, page || 1);
    const offset = (validatedPage - 1) * limit;
    const conditions = [];
    if (userId) conditions.push(eq(codeSnippets.userId, userId));
    if (search) conditions.push(like(codeSnippets.title, `%${search}%`));
    
    const [{ value: total }] = await db.select({ value: count() }).from(codeSnippets).where(conditions.length > 0 ? and(...conditions) : undefined);
    const items = await db.select({
      id: codeSnippets.id,
      userId: codeSnippets.userId,
      creatorUsername: users.username,
      title: codeSnippets.title,
      language: codeSnippets.language,
      code: codeSnippets.code,
      createdAt: codeSnippets.createdAt,
    })
    .from(codeSnippets)
    .leftJoin(users, eq(codeSnippets.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(codeSnippets.createdAt))
    .limit(limit)
    .offset(offset);
    return { items: items as unknown as ContentItemWithCreator[], total, page: validatedPage, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAllStudyPlans(options: ContentQueryOptions): Promise<PaginatedContent<ContentItemWithCreator>> {
    const { page, limit: requestedLimit, search, userId } = options;
    const limit = Math.min(requestedLimit || 50, 50);
    const validatedPage = Math.max(1, page || 1);
    const offset = (validatedPage - 1) * limit;
    const conditions = [];
    if (userId) conditions.push(eq(studyPlans.userId, userId));
    if (search) conditions.push(like(studyPlans.title, `%${search}%`));
    
    const [{ value: total }] = await db.select({ value: count() }).from(studyPlans).where(conditions.length > 0 ? and(...conditions) : undefined);
    const items = await db.select({
      id: studyPlans.id,
      userId: studyPlans.userId,
      creatorUsername: users.username,
      title: studyPlans.title,
      description: studyPlans.description,
      status: studyPlans.status,
      progressPercentage: studyPlans.completedPercentage,
      createdAt: studyPlans.createdAt,
    })
    .from(studyPlans)
    .leftJoin(users, eq(studyPlans.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(studyPlans.createdAt))
    .limit(limit)
    .offset(offset);
    return { items: items as unknown as ContentItemWithCreator[], total, page: validatedPage, limit, totalPages: Math.ceil(total / limit) };
  }

  async resolveFlag(id: number, status: 'dismissed' | 'actioned'): Promise<void> {
    await db.update(contentFlags).set({ status }).where(eq(contentFlags.id, id));
  }

  async scanToxicity(sampleLimit: number = 50): Promise<{ scannedCount: number; newlyFlagged: number; items: any[] }> {
    try {
      const toxicPattern = /\b(hack|bypass|exploit|malware|phishing|cheat|suicide|kill|hate|fuck|shit|bitch)\b/i;
      let newlyFlagged = 0;
      const flaggedItems: any[] = [];

      // Fetch existing pending flags to avoid duplicate flagging on consecutive scans
      const existingFlags = await db.select().from(contentFlags).where(eq(contentFlags.status, 'pending'));
      const isAlreadyFlagged = (type: string, id: number) => 
        existingFlags.some((f: any) => f.contentType === type && f.contentId === id);

      // Check flashcards
      const recentCards = await db.select().from(flashcards).orderBy(desc(flashcards.id)).limit(sampleLimit);
      for (const card of recentCards) {
        if (!isAlreadyFlagged('flashcard', card.id) && (toxicPattern.test(card.question) || toxicPattern.test(card.answer))) {
          const match = card.question.match(toxicPattern)?.[0] || card.answer.match(toxicPattern)?.[0];
          const [flag] = await db.insert(contentFlags).values({
            userId: card.userId || 1,
            contentType: 'flashcard',
            contentId: card.id,
            reason: `Automated Toxicity Scanner detected suspicious word in flashcard: "${match}"`,
            status: 'pending',
          }).returning();
          newlyFlagged++;
          flaggedItems.push(flag);
        }
      }

      // Check user documents/notes
      const recentDocs = await db.select().from(documents).orderBy(desc(documents.id)).limit(sampleLimit);
      for (const doc of recentDocs) {
        if (!isAlreadyFlagged('document', doc.id) && (toxicPattern.test(doc.title) || (doc.content && toxicPattern.test(doc.content)))) {
          const match = doc.title.match(toxicPattern)?.[0] || doc.content?.match(toxicPattern)?.[0];
          const [flag] = await db.insert(contentFlags).values({
            userId: doc.userId,
            contentType: 'document',
            contentId: doc.id,
            reason: `Automated Toxicity Scanner detected suspicious word in notes: "${match}"`,
            status: 'pending',
          }).returning();
          newlyFlagged++;
          flaggedItems.push(flag);
        }
      }

      // Check code snippets
      const recentSnippets = await db.select().from(codeSnippets).orderBy(desc(codeSnippets.id)).limit(sampleLimit);
      for (const snippet of recentSnippets) {
        if (!isAlreadyFlagged('code_snippet', snippet.id) && (toxicPattern.test(snippet.title) || (snippet.code && toxicPattern.test(snippet.code)))) {
          const match = snippet.title.match(toxicPattern)?.[0] || snippet.code?.match(toxicPattern)?.[0];
          const [flag] = await db.insert(contentFlags).values({
            userId: snippet.userId,
            contentType: 'code_snippet',
            contentId: snippet.id,
            reason: `Automated Toxicity Scanner detected suspicious word/script in code snippet: "${match}"`,
            status: 'pending',
          }).returning();
          newlyFlagged++;
          flaggedItems.push(flag);
        }
      }

      // Check saved quizzes
      const recentQuizzes = await db.select().from(savedQuizzes).orderBy(desc(savedQuizzes.id)).limit(sampleLimit);
      for (const quiz of recentQuizzes) {
        if (!isAlreadyFlagged('quiz', quiz.id) && (toxicPattern.test(quiz.title) || (quiz.description && toxicPattern.test(quiz.description)))) {
          const match = quiz.title.match(toxicPattern)?.[0] || quiz.description?.match(toxicPattern)?.[0];
          const [flag] = await db.insert(contentFlags).values({
            userId: quiz.userId,
            contentType: 'quiz',
            contentId: quiz.id,
            reason: `Automated Toxicity Scanner detected suspicious word in quiz: "${match}"`,
            status: 'pending',
          }).returning();
          newlyFlagged++;
          flaggedItems.push(flag);
        }
      }

      const totalScanned = recentCards.length + recentDocs.length + recentSnippets.length + recentQuizzes.length;
      Logger.info(LogCategory.ADMIN, `Toxicity scan completed: ${totalScanned} items scanned, ${newlyFlagged} newly flagged.`);
      return { scannedCount: totalScanned, newlyFlagged, items: flaggedItems };
    } catch (error) {
      Logger.error(LogCategory.ADMIN, 'Failed during content toxicity scan', error as Error);
      throw new Error('Toxicity scan failed');
    }
  }

  /**
   * Get global content counts and moderation statistics
   */
  async getContentStats(): Promise<{
    totalContent: number;
    flaggedItems: number;
    byType: {
      flashcards: number;
      quizzes: number;
      documents: number;
      questions: number;
      studyPlans: number;
      codeSnippets: number;
    };
  }> {
    try {
      const [cardCount] = await db.select({ count: count(flashcards.id) }).from(flashcards);
      const [quizCount] = await db.select({ count: count(savedQuizzes.id) }).from(savedQuizzes);
      const [docCount] = await db.select({ count: count(documents.id) }).from(documents);
      const [qCount] = await db.select({ count: count(questions.id) }).from(questions);
      const [planCount] = await db.select({ count: count(studyPlans.id) }).from(studyPlans);
      const [snippetCount] = await db.select({ count: count(codeSnippets.id) }).from(codeSnippets);
      const [flagCount] = await db.select({ count: count(contentFlags.id) }).from(contentFlags).where(eq(contentFlags.status, 'pending'));

      const flashcardsNum = Number(cardCount?.count) || 0;
      const quizzesNum = Number(quizCount?.count) || 0;
      const docsNum = Number(docCount?.count) || 0;
      const questionsNum = Number(qCount?.count) || 0;
      const plansNum = Number(planCount?.count) || 0;
      const snippetsNum = Number(snippetCount?.count) || 0;
      const flaggedItems = Number(flagCount?.count) || 0;

      const totalContent = flashcardsNum + quizzesNum + docsNum + questionsNum + plansNum + snippetsNum;

      return {
        totalContent,
        flaggedItems,
        byType: {
          flashcards: flashcardsNum,
          quizzes: quizzesNum,
          documents: docsNum,
          questions: questionsNum,
          studyPlans: plansNum,
          codeSnippets: snippetsNum,
        },
      };
    } catch (error) {
      Logger.error(LogCategory.ADMIN, 'Failed to fetch content stats', error as Error);
      return {
        totalContent: 0,
        flaggedItems: 0,
        byType: {
          flashcards: 0,
          quizzes: 0,
          documents: 0,
          questions: 0,
          studyPlans: 0,
          codeSnippets: 0,
        },
      };
    }
  }
}

// Export singleton instance
export const adminContentService = new AdminContentService();
