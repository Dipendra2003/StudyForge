import type { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { handleApiError } from "../middleware/errorHandler";
import { Logger, LogCategory } from "../utils/logger";
import { storage } from "../storage";
import { insertSavedQuizSchema, insertFavoriteQuizSchema } from "@shared/schema";

export function registerSavedFavoriteQuizRoutes(router: Router): void {
  /**
   * Save a quiz for later
   * POST /api/quiz/save
   * 
   * Requirements: 24.1, 24.2
   * 
   * Body:
   * - category: string - Quiz category
   * - difficulty: 'easy' | 'medium' | 'hard' - Quiz difficulty
   * - questionTypes: string[] - Array of question types
   * - questionCount: number - Number of questions
   * - title?: string - Optional quiz title
   * - description?: string - Optional quiz description
   */
  router.post('/api/quiz/save', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const quizData = insertSavedQuizSchema.omit({ userId: true }).parse(req.body);

      Logger.info(LogCategory.API, 'Saving quiz for later', {
        userId,
        category: quizData.category,
        difficulty: quizData.difficulty,
      });

      const savedQuiz = await storage.saveQuiz(userId, quizData);

      Logger.info(LogCategory.API, 'Quiz saved successfully', {
        userId,
        quizId: savedQuiz.id,
      });

      return res.status(201).json({
        success: true,
        message: 'Quiz saved for later',
        quiz: savedQuiz,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error saving quiz', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get all saved quizzes for the current user
   * GET /api/quiz/saved
   * 
   * Requirements: 24.2, 24.5
   */
  router.get('/api/quiz/saved', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      Logger.info(LogCategory.API, 'Fetching saved quizzes', { userId });

      const savedQuizzes = await storage.getSavedQuizzes(userId);

      return res.status(200).json({
        success: true,
        quizzes: savedQuizzes,
        count: savedQuizzes.length,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching saved quizzes', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Remove a saved quiz
   * DELETE /api/quiz/saved/:id
   * 
   * Requirements: 24.2
   */
  router.delete('/api/quiz/saved/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const quizId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      if (isNaN(quizId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid quiz ID',
          },
        });
      }

      Logger.info(LogCategory.API, 'Removing saved quiz', { userId, quizId });

      await storage.removeSavedQuiz(userId, quizId);

      Logger.info(LogCategory.API, 'Saved quiz removed successfully', { userId, quizId });

      return res.status(200).json({
        success: true,
        message: 'Saved quiz removed',
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error removing saved quiz', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Favorite a quiz
   * POST /api/quiz/favorite
   * 
   * Requirements: 24.3, 24.4
   * 
   * Body:
   * - category: string - Quiz category
   * - difficulty: 'easy' | 'medium' | 'hard' - Quiz difficulty
   * - questionTypes: string[] - Array of question types
   * - questionCount: number - Number of questions
   * - title?: string - Optional quiz title
   * - description?: string - Optional quiz description
   */
  router.post('/api/quiz/favorite', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const quizData = insertFavoriteQuizSchema.omit({ userId: true }).parse(req.body);

      Logger.info(LogCategory.API, 'Favoriting quiz', {
        userId,
        category: quizData.category,
        difficulty: quizData.difficulty,
      });

      // Check if already favorited
      const isFavorite = await storage.isFavoriteQuiz(userId, quizData.category, quizData.difficulty);
      
      if (isFavorite) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ALREADY_FAVORITED',
            message: 'Quiz is already in favorites',
          },
        });
      }

      const favoriteQuiz = await storage.favoriteQuiz(userId, quizData);

      Logger.info(LogCategory.API, 'Quiz favorited successfully', {
        userId,
        quizId: favoriteQuiz.id,
      });

      return res.status(201).json({
        success: true,
        message: 'Quiz added to favorites',
        quiz: favoriteQuiz,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error favoriting quiz', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get all favorite quizzes for the current user
   * GET /api/quiz/favorites
   * 
   * Requirements: 24.4, 24.5
   */
  router.get('/api/quiz/favorites', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      Logger.info(LogCategory.API, 'Fetching favorite quizzes', { userId });

      const favoriteQuizzes = await storage.getFavoriteQuizzes(userId);

      return res.status(200).json({
        success: true,
        quizzes: favoriteQuizzes,
        count: favoriteQuizzes.length,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching favorite quizzes', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Remove a favorite quiz
   * DELETE /api/quiz/favorites/:id
   * 
   * Requirements: 24.4
   */
  router.delete('/api/quiz/favorites/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const quizId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      if (isNaN(quizId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid quiz ID',
          },
        });
      }

      Logger.info(LogCategory.API, 'Removing favorite quiz', { userId, quizId });

      await storage.removeFavoriteQuiz(userId, quizId);

      Logger.info(LogCategory.API, 'Favorite quiz removed successfully', { userId, quizId });

      return res.status(200).json({
        success: true,
        message: 'Quiz removed from favorites',
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error removing favorite quiz', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Check if a quiz is favorited
   * GET /api/quiz/is-favorite
   * 
   * Query params:
   * - category: string
   * - difficulty: string
   */
  router.get('/api/quiz/is-favorite', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { category, difficulty } = req.query;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      if (!category || !difficulty) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Category and difficulty are required',
          },
        });
      }

      const isFavorite = await storage.isFavoriteQuiz(userId, category as string, difficulty as string);

      return res.status(200).json({
        success: true,
        isFavorite,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error checking favorite status', error as Error);
      return handleApiError(error, res);
    }
  });
}
