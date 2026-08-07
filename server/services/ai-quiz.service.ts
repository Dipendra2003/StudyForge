/**
 * AI Quiz Service
 * 
 * This service provides AI-powered quiz generation and assistance features.
 * 
 * IMPORTANT - REGRESSION PREVENTION (FIX-1):
 * ==========================================
 * Quiz generation MUST use BatchQuizGenerator which makes exactly ONE AI API call.
 * Per-question AI generation has been REMOVED to prevent rate-limit issues.
 * 
 * DO NOT reintroduce:
 * - Sequential question generation loops
 * - Per-question AI calls for quiz generation
 * - generateQuizWithRetry() or similar patterns
 * 
 * The ONLY entry point for quiz generation is generateQuiz() which delegates
 * to quizCacheService.generateQuizWithCache() for caching support.
 * 
 * CACHING LAYER (FIX-2):
 * ======================
 * Quiz generation now uses QuizCacheService to cache AI-generated questions.
 * When identical quiz configurations are requested, cached questions are returned
 * instead of making new AI calls, reducing costs and improving performance.
 */

import { geminiService } from "./gemini";
import { questionService } from "./question.service";
import { quizCacheService } from "./quiz-cache-service";
import type { Question, QuestionType } from "../../shared/quiz-types";
import { AIError } from "../utils/ai-errors";
import { Logger, LogCategory } from "../utils/logger";

/**
 * AI-powered quiz service for generating questions and providing assistance
 * 
 * ARCHITECTURE NOTE:
 * - generateQuiz() → Uses QuizCacheService (caching layer over BatchQuizGenerator)
 * - generateHint() → Single AI call for hint generation
 * - generateExplanation() → Single AI call for explanation
 * - generateMotivation() → Single AI call for motivation
 * - adaptDifficulty() → Single AI call for notification
 * - getWeakAreaRecommendations() → Single AI call for recommendations
 */
export class AIQuizService {
  /**
   * Generate multiple questions in bulk using batch generation with caching
   * 
   * CRITICAL: This is the ONLY method for quiz generation.
   * It uses QuizCacheService to check cache first, then falls back to
   * BatchQuizGenerator for a SINGLE AI API call if cache miss.
   * 
   * Quiz generation must NEVER call AI more than once per quiz request.
   * 
   * @param topic - The topic for the questions (takes precedence over category when provided)
   * @param count - Number of questions to generate
   * @param difficulty - Difficulty level
   * @param userId - User ID for logging
   * @param questionTypes - Types of questions to generate (if not specified, uses all types)
   * @param category - Category for the questions (ONLY used if topic is empty/not provided)
   * @returns Array of generated questions
   * 
   * Requirements: 1.1, 1.2 - Single batch AI request, no sequential generation loops
   * Requirements: 3.1, 3.2, 3.3, 3.4 - Cache lookup flow
   */
  async generateQuiz(
    topic: string,
    count: number,
    difficulty: 'easy' | 'medium' | 'hard',
    userId: number,
    questionTypes?: QuestionType[],
    category: string = 'General Knowledge'
  ): Promise<Question[]> {
    // Validate inputs
    if (count < 1 || count > 50) {
      throw new Error('Question count must be between 1 and 50');
    }
    
    // FIX: When topic is provided, use ONLY the topic and ignore category
    // When topic is empty, fall back to category
    const actualTopic = (topic && topic.trim().length > 0) ? topic.trim() : category;
    const actualCategory = (category && category.trim().length > 0) ? category.trim() : actualTopic;
    
    // Validate topic is not empty or whitespace-only
    if (!actualTopic || actualTopic.trim().length === 0) {
      throw new Error('Topic or category must be provided');
    }

    // Default to all question types if not specified
    const types: QuestionType[] = questionTypes || ['mcq', 'true-false', 'fill-blank', 'matching', 'rearrange'];

    Logger.info(LogCategory.AI, 'Quiz generation requested (cache-aware batch mode)', {
      providedTopic: topic,
      providedCategory: category,
      actualTopicUsed: actualTopic,
      topicWasProvided: !!(topic && topic.trim().length > 0),
      count,
      difficulty,
      userId,
      questionTypes: types,
    });

    // Use QuizCacheService for cache-aware generation
    // This checks cache first, then falls back to BatchQuizGenerator on cache miss
    // Requirements: 3.1 (check cache first), 3.2 (return cached on hit), 3.3 (AI on miss), 3.4 (store on success)
    const cacheResponse = await quizCacheService.generateQuizWithCache({
      category: actualCategory,
      topic: actualTopic,
      difficulty,
      questionTypes: types,
      questionCount: count,
      userId,
    });

    Logger.info(LogCategory.AI, 'Quiz generation completed (cache-aware batch mode)', {
      questionCount: cacheResponse.questions.length,
      source: cacheResponse.source,
      cacheHit: cacheResponse.cacheHit,
      generationTimeMs: cacheResponse.generationTimeMs,
      userId,
    });

    return cacheResponse.questions;
  }

  /**
   * Generate a hint for a question
   * 
   * @param question - The question to generate a hint for
   * @param attemptNumber - Which hint attempt this is (for progressive hints)
   * @returns Hint text
   */
  async generateHint(question: Question, attemptNumber: number = 1, userId?: number): Promise<string> {
    const hintLevel = attemptNumber === 1 ? 'subtle' : attemptNumber === 2 ? 'moderate' : 'specific';
    
    const prompt = `Generate a ${hintLevel} hint for this question. The hint should help the user think about the answer WITHOUT revealing it directly.

Question: ${question.question}
Type: ${question.type}
Difficulty: ${question.difficulty}

Rules:
- Do NOT include the exact answer
- Provide a clue that guides thinking
- For hint level "${hintLevel}":
  ${hintLevel === 'subtle' ? '- Give a very general direction or concept' : ''}
  ${hintLevel === 'moderate' ? '- Provide more specific guidance but still require thinking' : ''}
  ${hintLevel === 'specific' ? '- Give a strong clue that narrows down the answer significantly' : ''}

Provide only the hint text, nothing else.`;

    try {
      // Use the provided userId or fall back to question.userId
      const hint = await geminiService.generateContent(prompt, { temperature: 0.7 }, userId || question.userId);
      return hint.trim();
    } catch (error) {
      throw new Error(`Failed to generate hint: ${(error as Error).message}`);
    }
  }

  /**
   * Generate an explanation for an answer
   * 
   * @param question - The question
   * @param userAnswer - The user's answer
   * @param isCorrect - Whether the answer was correct
   * @returns Explanation text
   */
  async generateExplanation(
    question: Question,
    userAnswer: string | string[] | Record<string, string>,
    isCorrect: boolean
  ): Promise<string> {
    const prompt = `Provide a clear explanation for this quiz question.

Question: ${question.question}
Correct Answer: ${JSON.stringify(question.correctAnswer)}
User's Answer: ${JSON.stringify(userAnswer)}
Result: ${isCorrect ? 'Correct' : 'Incorrect'}

${isCorrect 
  ? 'Explain why this answer is correct and provide additional context or insights.'
  : 'Explain why the user\'s answer is incorrect and why the correct answer is right. Be supportive and educational.'}

Keep the explanation concise (2-3 sentences) and educational.`;

    try {
      const explanation = await geminiService.generateContent(prompt, { temperature: 0.6 }, question.userId);
      return explanation.trim();
    } catch (error) {
      // Fall back to the question's built-in explanation
      return question.explanation;
    }
  }

  /**
   * Generate motivational feedback based on performance
   * 
   * @param performance - Performance context (score, streak, etc.)
   * @returns Motivational message
   */
  async generateMotivation(performance: {
    isCorrect?: boolean;
    streak?: number;
    score?: number;
    totalQuestions?: number;
    questionsAnswered?: number;
    type?: 'answer' | 'periodic';
  }): Promise<string> {
    const { isCorrect, streak, score, totalQuestions, questionsAnswered, type = 'answer' } = performance;

    let prompt = '';
    
    // Handle periodic encouragement (not tied to a specific answer)
    if (type === 'periodic') {
      if (score !== undefined && totalQuestions !== undefined && questionsAnswered !== undefined) {
        // Calculate percentage based on questions answered so far, not total questions
        const percentage = questionsAnswered > 0 ? Math.round((score / questionsAnswered) * 100) : 0;
        const remaining = totalQuestions - questionsAnswered;
        
        if (percentage >= 80) {
          prompt = `Generate a brief encouraging message for a student who is doing great with ${percentage}% correct and ${remaining} questions remaining. Keep it to 1 sentence.`;
        } else if (percentage >= 50) {
          prompt = `Generate a brief motivational message for a student who is doing okay with ${percentage}% correct and ${remaining} questions remaining. Encourage them to stay focused. Keep it to 1 sentence.`;
        } else {
          prompt = `Generate a brief supportive message for a student who is struggling with ${percentage}% correct and ${remaining} questions remaining. Encourage them not to give up. Keep it to 1 sentence.`;
        }
      } else {
        prompt = 'Generate a brief encouraging message for a student taking a quiz. Keep it to 1 sentence.';
      }
    } 
    // Handle answer-specific feedback
    else {
      if (isCorrect) {
        if (streak && streak >= 3) {
          prompt = `Generate an enthusiastic congratulatory message for a student who just answered correctly and is on a ${streak}-question streak. Keep it to 1 sentence.`;
        } else {
          prompt = 'Generate a brief encouraging message for a student who just answered a question correctly. Keep it to 1 sentence.';
        }
      } else if (isCorrect === false) {
        prompt = 'Generate a brief supportive message for a student who just answered incorrectly. Encourage them to keep trying. Keep it to 1 sentence.';
      }

      if (score !== undefined && totalQuestions !== undefined) {
        const percentage = Math.round((score / totalQuestions) * 100);
        prompt += ` Their current score is ${percentage}%.`;
      }
    }

    try {
      // Use a 3-second timeout so the quiz UI stays responsive if the AI API experiences network delays or retries
      const motivation = await Promise.race([
        geminiService.generateContent(prompt, { temperature: 0.8, maxOutputTokens: 100 }),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Motivation request timed out')), 3000))
      ]);
      return motivation.trim();
    } catch (error) {
      // Fallback to simple messages based on type
      if (type === 'periodic') {
        const messages = [
          "You're doing great! Keep up the momentum! 💪",
          "Stay focused! You've got this! 🎯",
          "Great progress! Keep going! 🌟",
          "You're on the right track! 🚀",
        ];
        return messages[Math.floor(Math.random() * messages.length)];
      } else {
        // Answer-specific fallback
        if (isCorrect) {
          return streak && streak >= 3 
            ? `Amazing! ${streak} in a row! You're on fire! 🔥`
            : 'Great job! Keep it up! 👍';
        } else {
          return 'Don\'t worry, learning from mistakes makes you stronger! 💪';
        }
      }
    }
  }

  /**
   * Adapt difficulty based on user performance
   * 
   * @param userId - User ID
   * @param recentPerformance - Array of recent scores (0-1)
   * @param currentDifficulty - Current difficulty level
   * @returns Object with recommended difficulty and notification message
   */
  async adaptDifficulty(
    userId: number,
    recentPerformance: number[],
    currentDifficulty: 'easy' | 'medium' | 'hard'
  ): Promise<{
    difficulty: 'easy' | 'medium' | 'hard';
    changed: boolean;
    notification?: string;
  }> {
    if (recentPerformance.length < 3) {
      return {
        difficulty: currentDifficulty,
        changed: false,
      };
    }

    // Calculate average of last 3 scores
    const lastThree = recentPerformance.slice(-3);
    const average = lastThree.reduce((sum, score) => sum + score, 0) / lastThree.length;
    const percentage = Math.round(average * 100);

    // Increase difficulty if consistently scoring above 85%
    if (average > 0.85 && currentDifficulty !== 'hard') {
      const newDifficulty = currentDifficulty === 'easy' ? 'medium' : 'hard';
      const notification = await this.generateDifficultyChangeNotification(
        currentDifficulty,
        newDifficulty,
        percentage,
        'increase'
      );
      
      return {
        difficulty: newDifficulty,
        changed: true,
        notification,
      };
    }

    // Decrease difficulty if consistently scoring below 50%
    if (average < 0.50 && currentDifficulty !== 'easy') {
      const newDifficulty = currentDifficulty === 'hard' ? 'medium' : 'easy';
      const notification = await this.generateDifficultyChangeNotification(
        currentDifficulty,
        newDifficulty,
        percentage,
        'decrease'
      );
      
      return {
        difficulty: newDifficulty,
        changed: true,
        notification,
      };
    }

    return {
      difficulty: currentDifficulty,
      changed: false,
    };
  }

  /**
   * Generate a notification message for difficulty changes
   * 
   * @param oldDifficulty - Previous difficulty level
   * @param newDifficulty - New difficulty level
   * @param averageScore - Average score percentage
   * @param direction - Whether difficulty increased or decreased
   * @returns Notification message
   */
  private async generateDifficultyChangeNotification(
    oldDifficulty: 'easy' | 'medium' | 'hard',
    newDifficulty: 'easy' | 'medium' | 'hard',
    averageScore: number,
    direction: 'increase' | 'decrease'
  ): Promise<string> {
    const prompt = direction === 'increase'
      ? `Generate a brief encouraging message for a student whose quiz difficulty is being increased from ${oldDifficulty} to ${newDifficulty} because they've been performing well (${averageScore}% average). Make it motivating and congratulatory. Keep it to 1-2 sentences.`
      : `Generate a brief supportive message for a student whose quiz difficulty is being decreased from ${oldDifficulty} to ${newDifficulty} to help them build confidence (${averageScore}% average). Make it encouraging and positive. Keep it to 1-2 sentences.`;

    try {
      const notification = await geminiService.generateContent(prompt, { temperature: 0.7, maxOutputTokens: 100 });
      return notification.trim();
    } catch (error) {
      // Fallback messages
      if (direction === 'increase') {
        return `Great job! Your performance (${averageScore}% average) shows you're ready for ${newDifficulty} difficulty. Keep up the excellent work! 🎯`;
      } else {
        return `We're adjusting to ${newDifficulty} difficulty to help you build confidence. You've got this! 💪`;
      }
    }
  }

  /**
   * Analyze user performance and recommend weak areas to study
   * 
   * @param userId - User ID
   * @param categoryPerformance - Performance by category (category -> accuracy)
   * @param overallAccuracy - Overall accuracy across all categories
   * @returns Array of recommended topics/categories to study
   */
  async getWeakAreaRecommendations(
    userId: number,
    categoryPerformance: Record<string, number>,
    overallAccuracy: number
  ): Promise<{
    weakCategories: string[];
    recommendations: string[];
  }> {
    // Identify categories where performance is below overall average
    const weakCategories = Object.entries(categoryPerformance)
      .filter(([_, accuracy]) => accuracy < overallAccuracy)
      .sort(([_, a], [__, b]) => a - b) // Sort by accuracy (lowest first)
      .map(([category, _]) => category);

    if (weakCategories.length === 0) {
      return {
        weakCategories: [],
        recommendations: ['Great job! You\'re performing well across all categories. Keep practicing to maintain your skills!'],
      };
    }

    // Generate personalized recommendations using AI
    const prompt = `Generate 2-3 brief, actionable study recommendations for a student who needs to improve in these areas: ${weakCategories.slice(0, 3).join(', ')}. 

Their performance in these categories is below their overall average of ${Math.round(overallAccuracy * 100)}%.

Provide specific, encouraging suggestions for how they can improve. Keep each recommendation to 1 sentence.`;

    try {
      const response = await geminiService.generateContent(prompt, { temperature: 0.7, maxOutputTokens: 200 }, userId);
      
      // Parse recommendations (assuming they're separated by newlines or numbered)
      const recommendations = response
        .split(/\n+/)
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 3);

      return {
        weakCategories: weakCategories.slice(0, 3),
        recommendations: recommendations.length > 0 ? recommendations : [
          `Focus on practicing ${weakCategories[0]} questions to improve your understanding.`,
          'Review the explanations for questions you got wrong in these areas.',
          'Try taking quizzes specifically on your weak topics to build confidence.',
        ],
      };
    } catch (error) {
      // Fallback recommendations
      return {
        weakCategories: weakCategories.slice(0, 3),
        recommendations: [
          `Focus on practicing ${weakCategories[0]} questions to improve your understanding.`,
          'Review the explanations for questions you got wrong in these areas.',
          'Try taking quizzes specifically on your weak topics to build confidence.',
        ],
      };
    }
  }
}

// Export singleton instance
export const aiQuizService = new AIQuizService();
