import type { Request, Response, Router } from "express";
import { shareableQuizService } from "../services/shareable-quiz.service";
import { requireAuth } from "../middleware/auth.middleware";
import { handleApiError } from "../middleware/errorHandler";
import { Logger, LogCategory } from "../utils/logger";

/**
 * Shareable Quiz Link Routes
 * Implements Requirements 23.1, 23.2, 23.3, 23.4, 23.5
 */
export function registerShareableQuizRoutes(router: Router): void {
  /**
   * Generate a shareable link for a completed quiz
   * POST /api/quiz/share
   * 
   * Requirements: 23.1
   * Property 77: Shareable link uniqueness
   * 
   * Body:
   * - quizAttemptId: number - ID of the completed quiz attempt
   * - expiresInDays?: number - Optional expiration in days (default: 30)
   * 
   * Returns:
   * - linkId: string - Unique link identifier
   * - shareUrl: string - Full shareable URL path
   * - expiresAt: Date | null - Expiration date
   */
  router.post('/api/quiz/share', requireAuth, async (req: Request, res: Response) => {
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

      const { quizAttemptId, expiresInDays } = req.body;

      if (!quizAttemptId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Quiz attempt ID is required',
          },
        });
      }

      Logger.info(LogCategory.API, 'Generating shareable quiz link', {
        userId,
        quizAttemptId,
      });

      const shareableLink = await shareableQuizService.generateShareableLink(
        userId,
        quizAttemptId,
        expiresInDays
      );

      return res.status(200).json({
        success: true,
        data: shareableLink,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error generating shareable link', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get shareable quiz link details
   * GET /api/quiz/share/:linkId
   * 
   * Requirements: 23.2, 23.4
   * Property 78: Shared quiz accessibility
   * Property 80: Shareable link validation
   * 
   * Returns quiz details and questions for taking the shared quiz
   */
  router.get('/api/quiz/share/:linkId', async (req: Request, res: Response) => {
    try {
      const { linkId } = req.params;

      if (!linkId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Link ID is required',
          },
        });
      }

      Logger.info(LogCategory.API, 'Fetching shareable quiz link', { linkId });

      const linkData = await shareableQuizService.validateAndGetLink(linkId);

      if (!linkData) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shareable link not found, expired, or inactive',
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: linkData,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching shareable link', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Record completion of a shared quiz
   * POST /api/quiz/share/:linkId/complete
   * 
   * Requirements: 23.2, 23.3
   * Property 78: Shared quiz accessibility
   * 
   * Body:
   * - quizAttemptId: number - ID of the user's quiz attempt
   * 
   * Records the user's attempt on the shared quiz
   */
  router.post('/api/quiz/share/:linkId/complete', requireAuth, async (req: Request, res: Response) => {
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

      const { linkId } = req.params;
      const { quizAttemptId } = req.body;

      if (!linkId || !quizAttemptId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Link ID and quiz attempt ID are required',
          },
        });
      }

      Logger.info(LogCategory.API, 'Recording shared quiz completion', {
        userId,
        linkId,
        quizAttemptId,
      });

      await shareableQuizService.recordSharedQuizAttempt(
        linkId,
        userId,
        quizAttemptId
      );

      return res.status(200).json({
        success: true,
        message: 'Shared quiz attempt recorded successfully',
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error recording shared quiz completion', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get score comparison for a shared quiz
   * GET /api/quiz/share/:linkId/comparison
   * 
   * Requirements: 23.3, 23.5
   * Property 79: Shared quiz score comparison
   * 
   * Returns comparison of all participants' scores and rankings
   */
  router.get('/api/quiz/share/:linkId/comparison', async (req: Request, res: Response) => {
    try {
      const { linkId } = req.params;

      if (!linkId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Link ID is required',
          },
        });
      }

      Logger.info(LogCategory.API, 'Fetching shared quiz comparison', { linkId });

      const comparison = await shareableQuizService.getSharedQuizComparison(linkId);

      return res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching shared quiz comparison', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Deactivate a shareable link
   * DELETE /api/quiz/share/:linkId
   * 
   * Only the creator can deactivate their shareable links
   */
  router.delete('/api/quiz/share/:linkId', requireAuth, async (req: Request, res: Response) => {
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

      const { linkId } = req.params;

      if (!linkId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Link ID is required',
          },
        });
      }

      Logger.info(LogCategory.API, 'Deactivating shareable link', { userId, linkId });

      await shareableQuizService.deactivateLink(linkId, userId);

      return res.status(200).json({
        success: true,
        message: 'Shareable link deactivated successfully',
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error deactivating shareable link', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get all shareable links created by the user
   * GET /api/quiz/share
   * 
   * Returns list of all shareable links with stats
   */
  router.get('/api/quiz/share', requireAuth, async (req: Request, res: Response) => {
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

      Logger.info(LogCategory.API, 'Fetching user shareable links', { userId });

      const links = await shareableQuizService.getUserShareableLinks(userId);

      return res.status(200).json({
        success: true,
        data: links,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching user shareable links', error as Error);
      return handleApiError(error, res);
    }
  });
}
