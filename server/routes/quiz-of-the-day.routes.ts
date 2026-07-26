import type { Request, Response, Router } from "express";
import { quizOfTheDayService } from "../services/quiz-of-the-day.service";
import { AchievementService } from "../services/achievement.service";
import { requireAuth } from "../middleware/auth.middleware";
import { handleApiError } from "../middleware/errorHandler";
import { Logger, LogCategory } from "../utils/logger";
import { storage } from "../storage";

const achievementService = new AchievementService();

export function registerQuizOfTheDayRoutes(router: Router): void {
  /**
   * Get Quiz of the Day
   * GET /api/quiz-of-the-day
   * 
   * Requirements: 22.1, 22.2, 22.3, 22.5
   * 
   * Returns the Quiz of the Day configuration including:
   * - Category (trending or popular)
   * - Difficulty level
   * - Question count
   * - Bonus points available
   * - Whether user has completed it today
   */
  router.get('/api/quiz-of-the-day', requireAuth, async (req: Request, res: Response) => {
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

      Logger.info(LogCategory.API, 'Fetching Quiz of the Day', { userId });

      // Get Quiz of the Day
      const qotd = await quizOfTheDayService.getQuizOfTheDay();

      // Check if user has completed it today
      const hasCompleted = await quizOfTheDayService.hasCompletedToday(userId);

      // Get user's QOTD stats
      const stats = await quizOfTheDayService.getUserQOTDStats(userId);
      const userStats = await storage.getUserStats(userId);

      return res.status(200).json({
        success: true,
        quizOfTheDay: {
          ...qotd,
          completed: hasCompleted,
        },
        stats: {
          ...stats,
          globalXP: userStats?.xpPoints || 0
        },
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching Quiz of the Day', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Complete Quiz of the Day
   * POST /api/quiz-of-the-day/complete
   * 
   * Requirements: 22.4
   * 
   * Body:
   * - quizId: string - Quiz of the Day ID
   * - score: number - Quiz score (0-100)
   * - totalQuestions: number - Total questions
   * - correctAnswers: number - Correct answers
   * - incorrectAnswers: number - Incorrect answers
   * - timeSpent: number - Time spent in seconds
   * - accuracy: number - Accuracy percentage
   * 
   * Awards bonus points and special badge for Quiz of the Day completion
   */
  router.post('/api/quiz-of-the-day/complete', requireAuth, async (req: Request, res: Response) => {
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

      const { quizId, score, totalQuestions, correctAnswers, incorrectAnswers, timeSpent, accuracy, category, difficulty } = req.body;

      // Validate required fields
      if (!quizId || score === undefined || !totalQuestions || !correctAnswers || incorrectAnswers === undefined || !timeSpent || !accuracy || !category || !difficulty) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required quiz completion data',
          },
        });
      }

      Logger.info(LogCategory.API, 'Completing Quiz of the Day', { userId, quizId, score });

      // Check if already completed today
      const hasCompleted = await quizOfTheDayService.hasCompletedToday(userId);
      if (hasCompleted) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_COMPLETED',
            message: 'You have already completed the Quiz of the Day today',
          },
        });
      }

      // Award bonus points
      const bonusPoints = await quizOfTheDayService.awardBonusPoints(userId, quizId, {
        category,
        difficulty,
        score,
        totalQuestions,
        correctAnswers,
        timeSpent,
        accuracy,
      });

      // Check and award all applicable badges based on quiz results
      const newAchievements = await achievementService.checkAndAwardBadges(userId, {
        score,
        totalQuestions,
        correctAnswers,
        incorrectAnswers: incorrectAnswers || (totalQuestions - correctAnswers),
        timeSpent,
        accuracy,
        category,
        difficulty,
      });

      Logger.info(LogCategory.API, 'Quiz of the Day completed successfully', {
        userId,
        quizId,
        bonusPoints,
        newAchievements: newAchievements.length,
      });

      return res.status(200).json({
        success: true,
        message: 'Quiz of the Day completed successfully!',
        bonusPoints,
        newAchievements,
        achievementsEarned: newAchievements.length,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error completing Quiz of the Day', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get user's Quiz of the Day statistics
   * GET /api/quiz-of-the-day/stats
   * 
   * Returns user's QOTD completion stats including:
   * - Total completed
   * - Current streak
   * - Longest streak
   * - Total bonus points earned
   */
  router.get('/api/quiz-of-the-day/stats', requireAuth, async (req: Request, res: Response) => {
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

      Logger.info(LogCategory.API, 'Fetching Quiz of the Day stats', { userId });

      const stats = await quizOfTheDayService.getUserQOTDStats(userId);

      return res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching Quiz of the Day stats', error as Error);
      return handleApiError(error, res);
    }
  });
}
