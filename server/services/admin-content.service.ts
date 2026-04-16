/**
 * Admin Content Management Service
 * Handles content CRUD operations for admin panel
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */

import { db } from '../db/index';
import { documents, flashcards, mcqs, questions, users, savedQuizzes } from '../../shared/schema';
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
type ContentType = 'quiz' | 'flashcard' | 'document' | 'question';

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
          questionTypes: savedQuizzes.questionTypes,
          createdAt: savedQuizzes.savedAt, // Map savedAt to createdAt for consistency
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
        case 'quiz':
          table = mcqs;
          tableName = 'mcqs';
          break;
        case 'flashcard':
          table = flashcards;
          tableName = 'flashcards';
          break;
        case 'document':
          table = documents;
          tableName = 'documents';
          break;
        case 'question':
          table = questions;
          tableName = 'questions';
          break;
        default:
          throw new Error('Invalid content type');
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
        case 'quiz':
          table = mcqs;
          tableName = 'mcqs';
          break;
        case 'flashcard':
          table = flashcards;
          tableName = 'flashcards';
          break;
        case 'document':
          table = documents;
          tableName = 'documents';
          break;
        case 'question':
          table = questions;
          tableName = 'questions';
          break;
        default:
          throw new Error('Invalid content type');
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
      // Placeholder: Return empty array as flagging system is not implemented
      // In a real implementation, this would query a content_flags table
      Logger.info(LogCategory.ADMIN, 'Flagged content requested (not implemented)');
      return [];
    } catch (error) {
      Logger.error(LogCategory.ADMIN, 'Failed to get flagged content', error as Error);
      throw new Error('Failed to retrieve flagged content');
    }
  }
}

// Export singleton instance
export const adminContentService = new AdminContentService();
