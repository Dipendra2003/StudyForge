import type { Request, Response, Router } from "express";
import { aiQuizService } from "../services/ai-quiz.service";
import { AnalyticsService } from "../services/analytics.service";
import { AchievementService } from "../services/achievement.service";
import { requireAuth } from "../middleware/auth.middleware";
import { handleApiError } from "../middleware/errorHandler";
import { Logger, LogCategory } from "../utils/logger";

const analyticsService = new AnalyticsService();
const achievementService = new AchievementService();

export function registerQuizRoutes(router: Router): void {
  /**
   * Validate quiz answer
   * POST /api/quiz/validate-answer
   * 
   * SECURITY: This endpoint validates answers server-side to prevent cheating
   * The correct answer is never sent to the frontend
   * 
   * Body:
   * - questionId: number - ID of the question
   * - userAnswer: string | string[] | Record<string, string> - User's answer
   * 
   * Returns:
   * - isCorrect: boolean - Whether the answer is correct
   * - correctAnswer: string | string[] | Record<string, string> - The correct answer (only after submission)
   */
  router.post('/api/quiz/validate-answer', requireAuth, async (req: Request, res: Response) => {
    try {
      const { questionId, userAnswer } = req.body;
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

      if (!questionId || userAnswer === undefined || userAnswer === null) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Question ID and user answer are required',
          },
        });
      }

      Logger.info(LogCategory.API, 'Validating quiz answer', {
        userId,
        questionId,
      });

      // Import question service to fetch the question
      const { questionService } = await import('../services/question.service');
      
      // Fetch the question from database
      const question = await questionService.getQuestionById(questionId);
      
      if (!question) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Question not found',
          },
        });
      }

      // Validate the answer based on question type
      let isCorrect = false;
      const correctAnswer = question.correctAnswer;

      // MCQ - compare option IDs
      if (question.type === 'mcq') {
        isCorrect = userAnswer === correctAnswer;
      }
      // True/False - compare boolean strings
      else if (question.type === 'true-false') {
        isCorrect = userAnswer.toString().toLowerCase() === correctAnswer.toString().toLowerCase();
      }
      // Fill in the blank - compare arrays
      else if (question.type === 'fill-blank' && Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
        if (userAnswer.length !== correctAnswer.length) {
          isCorrect = false;
        } else {
          isCorrect = userAnswer.every((ans, idx) => 
            ans.trim().toLowerCase() === correctAnswer[idx].trim().toLowerCase()
          );
        }
      }
      // Matching - compare objects
      else if (question.type === 'matching' && typeof userAnswer === 'object' && typeof correctAnswer === 'object') {
        const userObj = userAnswer as Record<string, string>;
        const correctObj = correctAnswer as Record<string, string>;
        const keys = Object.keys(correctObj);
        isCorrect = keys.every(key => userObj[key] === correctObj[key]);
      }
      // Rearrange - compare arrays
      else if (question.type === 'rearrange' && Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
        if (userAnswer.length !== correctAnswer.length) {
          isCorrect = false;
        } else {
          isCorrect = userAnswer.every((val, idx) => val === correctAnswer[idx]);
        }
      }

      Logger.info(LogCategory.API, 'Answer validated', {
        userId,
        questionId,
        isCorrect,
      });

      return res.status(200).json({
        success: true,
        isCorrect,
        correctAnswer, // Only sent after user submits their answer
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error validating answer', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Generate motivational feedback
   * POST /api/quiz/motivation
   * 
   * Body:
   * - isCorrect?: boolean - Whether the answer was correct
   * - streak?: number - Current streak count
   * - score?: number - Current score
   * - totalQuestions?: number - Total questions in quiz
   * - questionsAnswered?: number - Questions answered so far
   * - type?: 'answer' | 'periodic' - Type of motivation (default: 'answer')
   */
  router.post('/api/quiz/motivation', requireAuth, async (req: Request, res: Response) => {
    try {
      const { isCorrect, streak, score, totalQuestions, questionsAnswered, type } = req.body;
      
      Logger.info(LogCategory.API, 'Generating motivational feedback', {
        userId: req.user?.id,
        type: type || 'answer',
        isCorrect,
        streak,
        score,
      });
      
      const motivation = await aiQuizService.generateMotivation({
        isCorrect,
        streak,
        score,
        totalQuestions,
        questionsAnswered,
        type: type || 'answer',
      });
      
      return res.status(200).json({
        success: true,
        motivation,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error generating motivation', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get user quiz analytics
   * GET /api/quiz/analytics
   * 
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   * 
   * Returns comprehensive performance data including:
   * - Total attempts and average score
   * - Improvement trend over time
   * - Category performance breakdown
   * - Difficulty performance breakdown
   * - Streak information
   */
  router.get('/api/quiz/analytics', requireAuth, async (req: Request, res: Response) => {
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

      Logger.info(LogCategory.API, 'Fetching quiz analytics', { userId });
      
      const analytics = await analyticsService.getUserStats(userId);
      
      return res.status(200).json({
        success: true,
        analytics,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching quiz analytics', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get adaptive difficulty recommendation
   * GET /api/quiz/adaptive-difficulty/:userId
   * 
   * Requirements: 12.3
   * 
   * Returns difficulty recommendation based on recent performance:
   * - difficulty: 'easy' | 'medium' | 'hard' - Recommended difficulty
   * - changed: boolean - Whether difficulty changed
   * - notification?: string - AI-generated notification message
   * - oldDifficulty?: string - Previous difficulty level
   * - averageScore?: number - Average score from recent quizzes
   */
  router.get('/api/quiz/adaptive-difficulty/:userId', requireAuth, async (req: Request, res: Response) => {
    try {
      const requestedUserId = parseInt(req.params.userId);
      const authenticatedUserId = req.user?.id;
      
      // Ensure users can only access their own difficulty recommendations
      if (!authenticatedUserId || requestedUserId !== authenticatedUserId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only access your own difficulty recommendations',
          },
        });
      }

      Logger.info(LogCategory.API, 'Fetching adaptive difficulty recommendation', { userId: requestedUserId });
      
      // Get recent quiz attempts (last 3)
      const analytics = await analyticsService.getUserStats(requestedUserId);
      
      // Get recent scores from analytics
      const recentScores = analytics.improvementTrend
        .slice(-3)
        .map(trend => trend.averageScore / 100); // Convert percentage to decimal
      
      // Get current difficulty from most recent quiz or default to 'medium'
      const currentDifficulty = analytics.difficultyPerformance && analytics.difficultyPerformance.length > 0
        ? analytics.difficultyPerformance
            .sort((a, b) => b.attempts - a.attempts)[0].difficulty as 'easy' | 'medium' | 'hard'
        : 'medium';
      
      // Get adaptive difficulty recommendation
      const recommendation = await aiQuizService.adaptDifficulty(
        requestedUserId,
        recentScores,
        currentDifficulty
      );
      
      Logger.info(LogCategory.API, 'Adaptive difficulty recommendation generated', {
        userId: requestedUserId,
        oldDifficulty: currentDifficulty,
        newDifficulty: recommendation.difficulty,
        changed: recommendation.changed,
      });
      
      return res.status(200).json({
        success: true,
        difficulty: recommendation.difficulty,
        changed: recommendation.changed,
        notification: recommendation.notification,
        oldDifficulty: currentDifficulty,
        averageScore: recentScores.length > 0 
          ? Math.round((recentScores.reduce((a, b) => a + b, 0) / recentScores.length) * 100)
          : undefined,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching adaptive difficulty', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Get weak area recommendations
   * GET /api/quiz/weak-areas/:userId
   * 
   * Requirements: 12.4
   * 
   * Returns weak area analysis and study recommendations:
   * - weakCategories: string[] - Categories where performance is below average
   * - recommendations: string[] - AI-generated study recommendations
   * - categoryPerformance: Record<string, number> - Performance by category
   * - overallAccuracy: number - Overall accuracy across all categories
   */
  router.get('/api/quiz/weak-areas/:userId', requireAuth, async (req: Request, res: Response) => {
    try {
      const requestedUserId = parseInt(req.params.userId);
      const authenticatedUserId = req.user?.id;
      
      // Ensure users can only access their own weak area recommendations
      if (!authenticatedUserId || requestedUserId !== authenticatedUserId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only access your own weak area recommendations',
          },
        });
      }

      Logger.info(LogCategory.API, 'Fetching weak area recommendations', { userId: requestedUserId });
      
      // Get user analytics to calculate category performance
      const analytics = await analyticsService.getUserStats(requestedUserId);
      
      // Extract category performance (accuracy by category)
      const categoryPerformance: Record<string, number> = {};
      let totalAccuracy = 0;
      let categoryCount = 0;
      
      if (analytics.categoryPerformance && analytics.categoryPerformance.length > 0) {
        for (const stats of analytics.categoryPerformance) {
          categoryPerformance[stats.category] = stats.accuracy;
          totalAccuracy += stats.accuracy;
          categoryCount++;
        }
      }
      
      const overallAccuracy = categoryCount > 0 ? totalAccuracy / categoryCount : 0;
      
      // Get weak area recommendations from AI service
      const recommendations = await aiQuizService.getWeakAreaRecommendations(
        requestedUserId,
        categoryPerformance,
        overallAccuracy
      );
      
      Logger.info(LogCategory.API, 'Weak area recommendations generated', {
        userId: requestedUserId,
        weakCategories: recommendations.weakCategories,
        recommendationCount: recommendations.recommendations.length,
      });
      
      return res.status(200).json({
        success: true,
        weakCategories: recommendations.weakCategories,
        recommendations: recommendations.recommendations,
        categoryPerformance,
        overallAccuracy: Math.round(overallAccuracy * 100),
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error fetching weak area recommendations', error as Error);
      return handleApiError(error, res);
    }
  });

  /**
   * Record quiz completion with achievements
   * POST /api/quiz/complete
   * 
   * Requirements: 9.1, 9.2, 9.3, 9.4, 26.4
   * 
   * Body:
   * - score: number - Quiz score (0-100)
   * - totalQuestions: number - Total questions in quiz
   * - correctAnswers: number - Number of correct answers
   * - incorrectAnswers: number - Number of incorrect answers
   * - timeSpent: number - Time spent in seconds
   * - accuracy: number - Accuracy percentage (0-100)
   * - category: string - Quiz category
   * - difficulty: 'easy' | 'medium' | 'hard' - Quiz difficulty
   * - questionsData?: any - Question details
   * - hintsUsed?: number - Number of hints used
   * - voiceModeEnabled?: boolean - Whether voice mode was enabled
   * 
   * Returns quiz results with newly earned achievements
   */
  router.post('/api/quiz/complete', requireAuth, async (req: Request, res: Response) => {
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

      const {
        score,
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        timeSpent,
        accuracy,
        category,
        difficulty,
        questionsData,
        hintsUsed,
        voiceModeEnabled,
      } = req.body;

      // Validate required fields
      if (
        score === undefined ||
        totalQuestions === undefined ||
        correctAnswers === undefined ||
        incorrectAnswers === undefined ||
        timeSpent === undefined ||
        accuracy === undefined ||
        !category ||
        !difficulty
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required quiz completion data',
          },
        });
      }

      Logger.info(LogCategory.API, 'Recording quiz completion', {
        userId,
        score,
        category,
        difficulty,
      });

      // Record quiz attempt in analytics
      await analyticsService.recordQuizAttempt({
        userId,
        category,
        difficulty,
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        score,
        accuracy,
        timeSpent,
        hintsUsed,
        voiceModeEnabled,
        questionsData,
        completed: true,
      });

      // Check and award achievements
      const newAchievements = await achievementService.checkAndAwardBadges(userId, {
        score,
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        timeSpent,
        accuracy,
        category,
        difficulty,
      });

      Logger.info(LogCategory.API, 'Quiz completion recorded successfully', {
        userId,
        score,
        newAchievements: newAchievements.length,
      });

      return res.status(200).json({
        success: true,
        message: 'Quiz completed successfully',
        newAchievements,
        achievementsEarned: newAchievements.length,
      });
    } catch (error) {
      Logger.error(LogCategory.API, 'Error recording quiz completion', error as Error);
      return handleApiError(error, res);
    }
  });
}
