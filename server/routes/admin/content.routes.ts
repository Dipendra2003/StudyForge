/**
 * Admin Content Management Routes
 * Handles all content management endpoints for admin panel
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 16.1, 16.2
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { adminContentService } from '../../services/admin-content.service';
import { Logger, LogCategory } from '../../utils/logger';
import { z } from 'zod';

const router = Router();

// Apply auth and role middleware to all routes
router.use(requireAuth);
router.use(requireRole('admin'));

/**
 * GET /api/admin/content/quizzes
 * Get all quizzes with pagination and filtering
 * Requirements: 5.1, 18.1
 */
router.get('/quizzes', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const category = req.query.category as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await adminContentService.getAllQuizzes({
      page,
      limit,
      search,
      userId,
      category,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get quizzes', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve quizzes',
      code: 'GET_QUIZZES_ERROR',
    });
  }
});

/**
 * GET /api/admin/content/flashcards
 * Get all flashcards with pagination and filtering
 * Requirements: 5.2, 18.1
 */
router.get('/flashcards', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const category = req.query.category as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await adminContentService.getAllFlashcards({
      page,
      limit,
      search,
      userId,
      category,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get flashcards', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve flashcards',
      code: 'GET_FLASHCARDS_ERROR',
    });
  }
});

/**
 * GET /api/admin/content/documents
 * Get all documents with pagination and filtering
 * Requirements: 5.3, 18.1
 */
router.get('/documents', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await adminContentService.getAllDocuments({
      page,
      limit,
      search,
      userId,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get documents', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents',
      code: 'GET_DOCUMENTS_ERROR',
    });
  }
});

/**
 * GET /api/admin/content/questions
 * Get all questions with pagination and filtering
 * Requirements: 5.4, 18.1
 */
router.get('/questions', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const category = req.query.category as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await adminContentService.getAllQuestions({
      page,
      limit,
      search,
      userId,
      category,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get questions', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve questions',
      code: 'GET_QUESTIONS_ERROR',
    });
  }
});

/**
 * GET /api/admin/content/flagged
 * Get flagged content
 * Requirements: 5.7
 */
router.get('/flagged', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await adminContentService.getFlaggedContent();

    res.json({
      success: true,
      data: {
        items: result,
        total: result.length,
        page: 1,
        limit: 50,
        totalPages: 1,
      },
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get flagged content', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve flagged content',
      code: 'GET_FLAGGED_ERROR',
    });
  }
});

/**
 * POST /api/admin/content/flagged/:id/resolve
 * Resolve or dismiss a content moderation flag
 */
router.post('/flagged/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }
    await adminContentService.resolveFlag(id, status === 'actioned' ? 'actioned' : 'dismissed');
    res.json({ success: true, message: `Flag marked as ${status || 'dismissed'}` });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to resolve flag', error as Error);
    res.status(500).json({ success: false, message: 'Failed to resolve flag' });
  }
});

/**
 * GET /api/admin/content/chat
 * Get AI chat interaction histories for monitoring and auditing
 */
router.get('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const result = await adminContentService.getAllChatHistories({ page, limit, search, userId });
    res.json({ success: true, data: result });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get chat histories', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve chat histories' });
  }
});

/**
 * GET /api/admin/content/code-snippets
 * Get AI generated code snippets for auditing
 */
router.get('/code-snippets', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const result = await adminContentService.getAllCodeSnippets({ page, limit, search, userId });
    res.json({ success: true, data: result });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get code snippets', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve code snippets' });
  }
});

/**
 * GET /api/admin/content/study-plans
 * Get user study plans for oversight
 */
router.get('/study-plans', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const result = await adminContentService.getAllStudyPlans({ page, limit, search, userId });
    res.json({ success: true, data: result });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to get study plans', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve study plans' });
  }
});

/**
 * POST /api/admin/content/scan-toxicity
 * Automated scanner to detect suspicious words or AI injections across decks and notes
 */
router.post('/scan-toxicity', async (req: Request, res: Response): Promise<void> => {
  try {
    const sampleLimit = parseInt(req.body.sampleLimit) || 50;
    const scanResult = await adminContentService.scanToxicity(sampleLimit);
    res.json({ success: true, data: scanResult, message: `Scanned ${scanResult.scannedCount} items; flagged ${scanResult.newlyFlagged} potential issues.` });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to run toxicity scan', error as Error);
    res.status(500).json({ success: false, message: 'Failed to complete toxicity scan' });
  }
});

/**
 * POST /api/admin/content/quizzes/seed
 * Populates sample enterprise quizzes into database for testing and demonstration
 */
router.post('/quizzes/seed', async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await adminContentService.seedSampleQuizzes(req.user!.id, req.user!.username);
    res.json({ success: true, message: `Successfully populated ${count} comprehensive sample quizzes!` });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to seed sample quizzes', error as Error);
    res.status(500).json({ success: false, message: 'Failed to seed sample quizzes' });
  }
});

/**
 * POST /api/admin/content/:type
 * Create new study resource (quizzes, flashcards, documents, questions)
 */
router.post('/:type', async (req: Request, res: Response): Promise<void> => {
  try {
    const contentType = req.params.type;
    const validTypes = ['quizzes', 'quiz', 'flashcards', 'flashcard', 'documents', 'document', 'questions', 'question'];
    if (!validTypes.includes(contentType)) {
      res.status(400).json({ success: false, message: 'Invalid or unsupported content type for creation' });
      return;
    }
    const result = await adminContentService.createContent(contentType, req.body, req.user!.id, req.user!.username);
    res.json({ success: true, data: result, message: 'Content resource created successfully!' });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to create content', error as Error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create content resource' });
  }
});

/**
 * PATCH /api/admin/content/:type/:id
 * Update content item
 * Requirements: 5.5
 */
router.patch('/:type/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const contentType = req.params.type;
    const contentId = parseInt(req.params.id);

    // Validate content type
    const validTypes = ['quizzes', 'quiz', 'flashcards', 'flashcard', 'documents', 'document', 'questions', 'question', 'chat_transcripts', 'chat', 'code_snippets', 'code_snippet', 'study_plans', 'study_plan', 'flagged', 'flag'];
    if (!validTypes.includes(contentType)) {
      res.status(400).json({
        success: false,
        message: 'Invalid content type',
        code: 'INVALID_CONTENT_TYPE',
      });
      return;
    }

    if (isNaN(contentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid content ID',
        code: 'INVALID_CONTENT_ID',
      });
      return;
    }

    // Validate update data based on content type
    let updateSchema;
    switch (contentType) {
      case 'quizzes':
      case 'quiz':
        updateSchema = z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          question: z.string().optional(),
          options: z.array(z.string()).optional(),
          correctOption: z.number().optional(),
          explanation: z.string().optional(),
          difficulty: z.string().optional(),
          category: z.string().optional(),
        });
        break;
      case 'flashcards':
      case 'flashcard':
        updateSchema = z.object({
          question: z.string().optional(),
          answer: z.string().optional(),
          category: z.string().optional(),
          difficulty: z.string().optional(),
        });
        break;
      case 'documents':
      case 'document':
        updateSchema = z.object({
          title: z.string().optional(),
          content: z.string().optional(),
          status: z.string().optional(),
        });
        break;
      case 'questions':
      case 'question':
        updateSchema = z.object({
          question: z.string().optional(),
          category: z.string().optional(),
          difficulty: z.string().optional(),
        });
        break;
      default:
        updateSchema = z.record(z.any());
        break;
    }

    const validationResult = updateSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    await adminContentService.updateContent(
      contentType,
      contentId,
      validationResult.data,
      req.user!.id,
      req.user!.username
    );

    res.json({
      success: true,
      message: 'Content updated successfully',
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to update content', error as Error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update content',
      code: 'UPDATE_CONTENT_ERROR',
    });
  }
});

/**
 * DELETE /api/admin/content/:type/:id
 * Delete content item
 * Requirements: 5.6
 */
router.delete('/:type/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const contentType = req.params.type;
    const contentId = parseInt(req.params.id);

    // Validate content type
    const validTypes = ['quizzes', 'quiz', 'flashcards', 'flashcard', 'documents', 'document', 'questions', 'question', 'chat_transcripts', 'chat', 'code_snippets', 'code_snippet', 'study_plans', 'study_plan', 'flagged', 'flag'];
    if (!validTypes.includes(contentType)) {
      res.status(400).json({
        success: false,
        message: 'Invalid content type',
        code: 'INVALID_CONTENT_TYPE',
      });
      return;
    }

    if (isNaN(contentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid content ID',
        code: 'INVALID_CONTENT_ID',
      });
      return;
    }

    await adminContentService.deleteContent(
      contentType,
      contentId,
      req.user!.id,
      req.user!.username
    );

    res.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    Logger.error(LogCategory.ADMIN, 'Failed to delete content', error as Error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete content',
      code: 'DELETE_CONTENT_ERROR',
    });
  }
});

export default router;
