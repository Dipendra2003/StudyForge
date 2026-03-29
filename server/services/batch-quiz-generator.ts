/**
 * Batch Quiz Generator
 * 
 * Generates all quiz questions in a single AI API call instead of
 * multiple per-question calls. This reduces rate-limit issues and
 * improves performance.
 * 
 */

import { geminiService } from "./gemini";
import { batchPromptBuilder } from "./batch-prompt-builder";
import { batchResponseValidator, type ValidatedQuestion } from "./batch-response-validator";
import { parseBatchJson, BatchJsonParseError } from "./batch-json-parser";
import { questionService } from "./question.service";
import type { Question, QuestionType, MCQData, QuestionOption } from "../../shared/quiz-types";
import { AIError, AIErrorCode } from "../utils/ai-errors";
import { Logger, LogCategory } from "../utils/logger";
import { validateQuestions, attemptAutoFix } from "../utils/question-validator";

/**
 * User-friendly error messages for different error scenarios
 * Requirement 6.1: Do not expose raw AI error messages
 */
const USER_FRIENDLY_MESSAGES: Record<AIErrorCode, string> = {
  [AIErrorCode.API_TIMEOUT]: 'Quiz generation timed out. Please try again.',
  [AIErrorCode.RATE_LIMIT]: 'Service is busy. Please wait a moment.',
  [AIErrorCode.INVALID_RESPONSE]: 'Unable to generate quiz. Please try again.',
  [AIErrorCode.API_KEY_ERROR]: 'Service configuration error. Please try again later.',
  [AIErrorCode.NETWORK_ERROR]: 'Connection issue. Please check your internet and try again.',
  [AIErrorCode.GENERATION_FAILED]: 'Unable to generate quiz. Please try again.',
  [AIErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
};

/**
 * Request parameters for batch quiz generation
 */
export interface BatchQuizRequest {
  category: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionTypes: QuestionType[];
  questionCount: number;
  userId: number;
}

/**
 * Response from batch quiz generation
 */
export interface BatchQuizResponse {
  questions: Question[];
  source: 'ai' | 'database' | 'mixed';
  generationTimeMs: number;
}

/**
 * Default timeout for AI requests (30 seconds)
 * Requirement 4.1
 */
const AI_REQUEST_TIMEOUT_MS = 30000;

/**
 * Batch Quiz Generator class
 * 
 * Generates all quiz questions in a single batch AI call.
 * Implements timeout handling and fallback to database questions.
 */
export class BatchQuizGenerator {
  /**
   * Sanitize and wrap errors to ensure user-friendly messages
   * 
   * This method ensures that:
   * 1. All errors are converted to AIError instances
   * 2. Technical details are logged for debugging
   * 3. User-facing messages don't expose AI internals
   * 
   * Requirements: 6.1, 6.2, 6.3
   * 
   * @param error - The original error
   * @param context - Additional context for logging
   * @returns AIError with sanitized user message
   */
  private sanitizeError(
    error: unknown,
    context: {
      userId?: number;
      category?: string;
      topic?: string;
      responsePreview?: string;
    }
  ): AIError {
    // If already an AIError, ensure message is sanitized
    if (error instanceof AIError) {
      // Log technical details (Requirement 6.2)
      Logger.error(LogCategory.AI, 'Batch generation error', error, {
        userId: context.userId,
        category: context.category,
        topic: context.topic,
        errorCode: error.code,
        originalMessage: error.message,
        responsePreview: context.responsePreview?.substring(0, 500),
        stack: error.stack,
      });

      // Return sanitized error (Requirement 6.1, 6.3)
      const sanitizedMessage = USER_FRIENDLY_MESSAGES[error.code] || USER_FRIENDLY_MESSAGES[AIErrorCode.UNKNOWN_ERROR];
      return new AIError(
        error.code,
        sanitizedMessage,
        error.retryable,
        error.originalError
      );
    }

    // Convert generic Error to AIError
    const genericError = error instanceof Error ? error : new Error(String(error));
    
    // Detect error type from message
    const errorCode = this.detectErrorCode(genericError);
    
    // Log technical details (Requirement 6.2)
    Logger.error(LogCategory.AI, 'Batch generation error (converted)', genericError, {
      userId: context.userId,
      category: context.category,
      topic: context.topic,
      errorCode,
      originalMessage: genericError.message,
      responsePreview: context.responsePreview?.substring(0, 500),
      stack: genericError.stack,
    });

    // Return sanitized error (Requirement 6.1, 6.3)
    const sanitizedMessage = USER_FRIENDLY_MESSAGES[errorCode];
    return new AIError(
      errorCode,
      sanitizedMessage,
      this.isRetryableError(errorCode),
      genericError
    );
  }

  /**
   * Detect the appropriate error code from an error message
   * 
   * @param error - The error to analyze
   * @returns The detected AIErrorCode
   */
  private detectErrorCode(error: Error): AIErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out') || message.includes('aborted')) {
      return AIErrorCode.API_TIMEOUT;
    }

    if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests') || message.includes('quota')) {
      return AIErrorCode.RATE_LIMIT;
    }

    if (message.includes('api key') || message.includes('unauthorized') || message.includes('401') || message.includes('authentication')) {
      return AIErrorCode.API_KEY_ERROR;
    }

    if (message.includes('network') || message.includes('econnreset') || message.includes('enotfound') || 
        message.includes('connection') || message.includes('503') || message.includes('socket')) {
      return AIErrorCode.NETWORK_ERROR;
    }

    if (message.includes('invalid') || message.includes('parse') || message.includes('json') || 
        message.includes('malformed') || message.includes('400')) {
      return AIErrorCode.INVALID_RESPONSE;
    }

    if (message.includes('failed') || message.includes('generation')) {
      return AIErrorCode.GENERATION_FAILED;
    }

    return AIErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Determine if an error is retryable based on its code
   * 
   * @param code - The error code
   * @returns Whether the error is retryable
   */
  private isRetryableError(code: AIErrorCode): boolean {
    const retryableCodes = [
      AIErrorCode.API_TIMEOUT,
      AIErrorCode.RATE_LIMIT,
      AIErrorCode.NETWORK_ERROR,
      AIErrorCode.INVALID_RESPONSE,
      AIErrorCode.GENERATION_FAILED,
      AIErrorCode.UNKNOWN_ERROR,
    ];
    return retryableCodes.includes(code);
  }

  /**
   * Generate all quiz questions in a single batch AI call
   * 
   * @param request - The batch quiz request parameters
   * @returns BatchQuizResponse with questions, source, and generation time
   * @throws AIError if both AI generation and database fallback fail
   * 
   * Requirements: 1.1, 1.3, 4.1, 4.2, 6.1, 6.2, 6.3
   */
  async generateBatch(request: BatchQuizRequest): Promise<BatchQuizResponse> {
    const startTime = Date.now();
    
    // Validate request
    this.validateRequest(request);
    
    Logger.info(LogCategory.AI, 'Starting batch quiz generation', {
      category: request.category,
      topic: request.topic,
      difficulty: request.difficulty,
      questionCount: request.questionCount,
      questionTypes: request.questionTypes,
      userId: request.userId,
    });

    try {
      // Attempt AI batch generation
      const questions = await this.generateWithTimeout(request);
      
      const generationTimeMs = Date.now() - startTime;
      
      Logger.info(LogCategory.AI, 'Batch quiz generation successful', {
        questionCount: questions.length,
        generationTimeMs,
        source: 'ai',
      });

      return {
        questions,
        source: 'ai',
        generationTimeMs,
      };
    } catch (error) {
      // Sanitize the error for logging and potential re-throw
      const sanitizedError = this.sanitizeError(error, {
        userId: request.userId,
        category: request.category,
        topic: request.topic,
      });

      // Log the sanitized warning
      Logger.warn(LogCategory.AI, 'Batch AI generation failed, attempting fallback', {
        errorCode: sanitizedError.code,
        userId: request.userId,
      });

      // Attempt database fallback
      return this.fallbackToDatabase(request, startTime, sanitizedError);
    }
  }

  /**
   * Generate questions with a timeout
   * 
   * @param request - The batch quiz request
   * @returns Array of generated questions
   * @throws Error if generation fails or times out
   * 
   * Requirement 4.1, 4.2
   */
  private async generateWithTimeout(request: BatchQuizRequest): Promise<Question[]> {
    // Create abort controller for timeout
    const abortController = new AbortController();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, AI_REQUEST_TIMEOUT_MS);

    try {
      // Race between generation and timeout
      const result = await Promise.race([
        this.performBatchGeneration(request),
        this.createTimeoutPromise(abortController.signal),
      ]);

      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create a promise that rejects when the abort signal is triggered
   */
  private createTimeoutPromise(signal: AbortSignal): Promise<never> {
    return new Promise((_, reject) => {
      if (signal.aborted) {
        reject(new AIError(
          AIErrorCode.API_TIMEOUT,
          'Quiz generation timed out. Please try again.',
          true
        ));
        return;
      }

      signal.addEventListener('abort', () => {
        reject(new AIError(
          AIErrorCode.API_TIMEOUT,
          'Quiz generation timed out. Please try again.',
          true
        ));
      });
    });
  }

  /**
   * Perform the actual batch generation
   * 
   * @param request - The batch quiz request
   * @returns Array of generated questions
   * 
   * Requirement 1.1, 1.3, 6.1, 6.2, 6.3
   */
  private async performBatchGeneration(request: BatchQuizRequest): Promise<Question[]> {
    // Build the batch prompt
    const prompt = batchPromptBuilder.build({
      category: request.category,
      topic: request.topic,
      difficulty: request.difficulty,
      types: request.questionTypes,
      count: request.questionCount,
    });

    let response: string;
    try {
      // Make SINGLE AI API call (Requirement 1.1, 1.3)
      response = await geminiService.generateContent(
        prompt,
        {
          temperature: 0.7,
          maxOutputTokens: 4096, // Larger output for batch
        },
        request.userId
      );
    } catch (aiError) {
      // Sanitize AI service errors (Requirement 6.1, 6.2, 6.3)
      throw this.sanitizeError(aiError, {
        userId: request.userId,
        category: request.category,
        topic: request.topic,
      });
    }

    // Parse the JSON response
    let parsedResponse: unknown[];
    try {
      parsedResponse = parseBatchJson(response);
    } catch (parseError) {
      // Log with response preview for debugging (Requirement 6.2)
      const responsePreview = response?.substring(0, 500) || 'No response';
      
      if (parseError instanceof BatchJsonParseError) {
        Logger.error(LogCategory.AI, 'Failed to parse batch response', parseError, {
          responsePreview: parseError.rawResponse.substring(0, 500),
          parseAttempts: parseError.parseAttempts,
          userId: request.userId,
        });
      }
      
      // Throw sanitized error (Requirement 6.1, 6.3)
      throw this.sanitizeError(
        new AIError(
          AIErrorCode.INVALID_RESPONSE,
          'AI generated an invalid response format',
          true,
          parseError as Error
        ),
        {
          userId: request.userId,
          category: request.category,
          topic: request.topic,
          responsePreview,
        }
      );
    }

    // Validate the response
    const validationResult = batchResponseValidator.validate(
      parsedResponse,
      request.questionCount,
      request.questionTypes
    );

    if (!validationResult.valid) {
      // Log validation errors with details (Requirement 6.2)
      Logger.warn(LogCategory.AI, 'Batch response validation failed', {
        errors: validationResult.errors,
        questionCount: parsedResponse.length,
        expectedCount: request.questionCount,
        userId: request.userId,
      });
      
      // Throw sanitized error (Requirement 6.1, 6.3)
      throw this.sanitizeError(
        new AIError(
          AIErrorCode.INVALID_RESPONSE,
          'AI generated an incomplete or invalid response',
          true
        ),
        {
          userId: request.userId,
          category: request.category,
          topic: request.topic,
          responsePreview: JSON.stringify(parsedResponse).substring(0, 500),
        }
      );
    }

    // Convert validated questions to Question objects for randomization
    const tempQuestions: Question[] = validationResult.questions.map(vq => ({
      id: 0, // Temporary ID
      userId: request.userId,
      type: vq.type,
      question: vq.question,
      questionData: vq.questionData,
      correctAnswer: vq.correctAnswer as string | string[] | number[] | Record<string, string>,
      explanation: vq.explanation,
      category: vq.category || request.category,
      difficulty: vq.difficulty || request.difficulty,
      tags: vq.tags || [request.topic],
      hints: vq.hints || [],
      isPublic: true,
      usageCount: 0,
      averageScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // CRITICAL FIX: Randomize MCQ options BEFORE saving to database
    // This ensures the database has the shuffled version, so when questions
    // are fetched later for validation/display, the correctAnswer field
    // matches the actual shuffled option positions
    const randomizedQuestions = this.forceRandomizeMCQAnswers(tempQuestions);

    // Save the randomized questions to database
    const savedQuestions = await this.saveRandomizedQuestions(
      randomizedQuestions,
      request
    );

    return savedQuestions;
  }

  /**
   * Force randomize MCQ correct answer positions to prevent AI bias
   * This is a POST-PROCESSING step that physically shuffles options
   * 
   * @param questions - Array of questions to randomize
   * @returns Array of questions with randomized MCQ options
   */
  private forceRandomizeMCQAnswers(questions: Question[]): Question[] {
    Logger.info(LogCategory.AI, 'Starting MCQ answer randomization', {
      totalQuestions: questions.length,
      mcqCount: questions.filter(q => q.type === 'mcq').length,
    });

    const result = questions.map((question, questionIndex) => {
      // Only process MCQ questions
      if (question.type !== 'mcq') {
        return question;
      }

      const mcqData = question.questionData as MCQData;
      if (!mcqData.options || mcqData.options.length !== 4) {
        Logger.warn(LogCategory.AI, 'Skipping MCQ with invalid options', {
          questionIndex,
          optionsCount: mcqData.options?.length || 0,
        });
        return question;
      }

      // Find the current correct answer option
      const currentCorrectId = question.correctAnswer as string;
      const correctOptionIndex = mcqData.options.findIndex((opt: QuestionOption) => opt.id === currentCorrectId);
      
      if (correctOptionIndex === -1) {
        Logger.warn(LogCategory.AI, 'Could not find correct answer in options', {
          questionIndex,
          correctAnswer: currentCorrectId,
        });
        return question;
      }

      // Get the text of the correct answer
      const correctAnswerText = mcqData.options[correctOptionIndex].text;

      // Shuffle all option texts using Fisher-Yates algorithm
      const optionTexts = mcqData.options.map((opt: QuestionOption) => opt.text);
      for (let i = optionTexts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionTexts[i], optionTexts[j]] = [optionTexts[j], optionTexts[i]];
      }

      // Create new options with shuffled texts but same IDs
      const newOptions = mcqData.options.map((opt: QuestionOption, idx: number) => ({
        ...opt,
        text: optionTexts[idx],
      }));

      // Find where the correct answer text ended up after shuffling
      const newCorrectIndex = newOptions.findIndex((opt: QuestionOption) => opt.text === correctAnswerText);
      const newCorrectAnswer = newOptions[newCorrectIndex].id;

      Logger.debug(LogCategory.AI, 'Shuffled MCQ options', {
        questionIndex,
        oldCorrectAnswer: currentCorrectId,
        newCorrectAnswer: newCorrectAnswer,
        correctAnswerText: correctAnswerText.substring(0, 50) + '...',
      });

      return {
        ...question,
        questionData: {
          ...mcqData,
          options: newOptions,
        },
        correctAnswer: newCorrectAnswer,
      };
    });

    const distribution = this.getAnswerDistribution(result);
    Logger.info(LogCategory.AI, 'MCQ answer randomization complete', {
      distribution,
      finalAnswers: result.filter(q => q.type === 'mcq').map(q => q.correctAnswer),
    });

    return result;
  }

  /**
   * Get distribution of correct answers for logging
   */
  private getAnswerDistribution(questions: Question[]): Record<string, number> {
    const distribution: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    questions.forEach(q => {
      if (q.type === 'mcq' && typeof q.correctAnswer === 'string') {
        distribution[q.correctAnswer] = (distribution[q.correctAnswer] || 0) + 1;
      }
    });
    return distribution;
  }

  /**
   * Save validated questions to the database
   * 
   * @param validatedQuestions - Array of validated questions from AI
   * @param request - Original request for metadata
   * @returns Array of saved Question objects
   * 
   * Requirements: 6.1, 6.2, 6.3
   */
  private async saveValidatedQuestions(
    validatedQuestions: ValidatedQuestion[],
    request: BatchQuizRequest
  ): Promise<Question[]> {
    const savedQuestions: Question[] = [];
    
    // First, convert to Question objects for validation
    const questionsToValidate: Question[] = validatedQuestions.map(vq => ({
      id: 0, // Temporary ID
      userId: request.userId,
      type: vq.type,
      question: vq.question,
      questionData: vq.questionData,
      correctAnswer: vq.correctAnswer as string | string[] | number[] | Record<string, string>,
      explanation: vq.explanation,
      category: vq.category || request.category,
      difficulty: vq.difficulty || request.difficulty,
      tags: vq.tags || [request.topic],
      hints: vq.hints || [],
      isPublic: true,
      usageCount: 0,
      averageScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return this.saveRandomizedQuestions(questionsToValidate, request);
  }

  /**
   * Save already-randomized questions to the database
   * 
   * @param questionsToValidate - Array of Question objects (already randomized)
   * @param request - Original request for metadata
   * @returns Array of saved Question objects
   * 
   * Requirements: 6.1, 6.2, 6.3
   */
  private async saveRandomizedQuestions(
    questionsToValidate: Question[],
    request: BatchQuizRequest
  ): Promise<Question[]> {
    const savedQuestions: Question[] = [];

    // Validate questions for logical correctness
    const validationResult = validateQuestions(questionsToValidate);
    
    if (validationResult.invalidQuestions.length > 0) {
      Logger.warn(LogCategory.AI, 'Some questions failed validation', {
        invalidCount: validationResult.invalidQuestions.length,
        totalCount: questionsToValidate.length,
        userId: request.userId,
      });
      
      // Try to auto-fix invalid questions
      for (const { question, errors } of validationResult.invalidQuestions) {
        Logger.warn(LogCategory.AI, 'Invalid question detected', {
          questionText: question.question.substring(0, 100),
          errors,
        });
        
        const fixed = attemptAutoFix(question);
        if (fixed) {
          Logger.info(LogCategory.AI, 'Question auto-fixed', {
            questionText: fixed.question.substring(0, 100),
          });
          validationResult.validQuestions.push(fixed);
        }
      }
    }
    
    // Use only valid questions
    const questionsToSave = validationResult.validQuestions;
    
    if (questionsToSave.length < request.questionCount) {
      Logger.error(LogCategory.AI, 'Not enough valid questions after validation', {
        requested: request.questionCount,
        valid: questionsToSave.length,
        invalid: validationResult.invalidQuestions.length,
      });
      
      throw this.sanitizeError(
        new AIError(
          AIErrorCode.INVALID_RESPONSE,
          `Only ${questionsToSave.length} of ${request.questionCount} questions passed validation`,
          true
        ),
        {
          userId: request.userId,
          category: request.category,
          topic: request.topic,
        }
      );
    }

    for (const question of questionsToSave) {
      try {
        const saved = await questionService.createQuestion({
          userId: question.userId,
          type: question.type,
          question: question.question,
          questionData: question.questionData,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          category: question.category,
          difficulty: question.difficulty,
          tags: question.tags,
          hints: question.hints,
          isPublic: question.isPublic,
        });
        
        savedQuestions.push(saved);
      } catch (saveError) {
        // Log technical details but don't expose to user (Requirement 6.2)
        Logger.warn(LogCategory.AI, 'Failed to save question, skipping', {
          error: (saveError as Error).message,
          questionType: question.type,
          userId: request.userId,
        });
        // Continue with other questions
      }
    }

    // If we couldn't save enough questions, throw a sanitized error
    if (savedQuestions.length < request.questionCount) {
      // Throw sanitized error (Requirement 6.1, 6.3)
      throw this.sanitizeError(
        new AIError(
          AIErrorCode.GENERATION_FAILED,
          'Failed to save all generated questions',
          true
        ),
        {
          userId: request.userId,
          category: request.category,
          topic: request.topic,
        }
      );
    }

    return savedQuestions;
  }

  /**
   * Fallback to database questions when AI generation fails
   * 
   * @param request - Original request parameters
   * @param startTime - Start time for timing calculation
   * @param originalError - The error that caused the fallback
   * @returns BatchQuizResponse with database questions
   * @throws AIError if fallback also fails
   * 
   * Requirement 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3
   */
  private async fallbackToDatabase(
    request: BatchQuizRequest,
    startTime: number,
    originalError: AIError
  ): Promise<BatchQuizResponse> {
    Logger.info(LogCategory.AI, 'Attempting database fallback', {
      category: request.category,
      difficulty: request.difficulty,
      questionTypes: request.questionTypes,
      questionCount: request.questionCount,
      originalErrorCode: originalError.code,
    });

    try {
      // Query database for questions matching the request parameters
      // Requirement 5.3: Match category, difficulty, and question types
      const dbQuestions = await questionService.getQuestions({
        category: request.category,
        difficulty: request.difficulty,
        questionTypes: request.questionTypes,
        limit: request.questionCount,
        isPublic: true,
      });

      // Requirement 5.2: Never return partial quiz
      if (dbQuestions.length < request.questionCount) {
        Logger.warn(LogCategory.AI, 'Database fallback has insufficient questions', {
          found: dbQuestions.length,
          needed: request.questionCount,
          userId: request.userId,
        });

        // Requirement 5.4: Return clear error if both fail
        // Use sanitized error message (Requirement 6.1, 6.3)
        throw new AIError(
          AIErrorCode.GENERATION_FAILED,
          'No questions available for this topic. Please try a different topic or difficulty.',
          false,
          originalError
        );
      }

      const generationTimeMs = Date.now() - startTime;

      // DO NOT shuffle database fallback questions
      // They are already saved in the database, and shuffling them here would only
      // affect the API response, not the stored data. This creates a mismatch when
      // validation fetches the question from the database later.
      // Only newly generated AI questions should be shuffled before saving.
      Logger.info(LogCategory.AI, 'Database fallback successful (no shuffling)', {
        questionCount: dbQuestions.length,
        generationTimeMs,
        source: 'database',
      });

      return {
        questions: dbQuestions,
        source: 'database',
        generationTimeMs,
      };
    } catch (fallbackError) {
      // If fallback error is already an AIError with sanitized message, rethrow it
      if (fallbackError instanceof AIError) {
        throw fallbackError;
      }

      // Log technical details (Requirement 6.2)
      Logger.error(LogCategory.AI, 'Database fallback failed', fallbackError as Error, {
        originalErrorCode: originalError.code,
        originalErrorMessage: originalError.message,
        userId: request.userId,
        category: request.category,
        topic: request.topic,
      });

      // Requirement 5.4, 6.1, 6.3: Return sanitized error message
      throw this.sanitizeError(
        new AIError(
          AIErrorCode.GENERATION_FAILED,
          'Database fallback failed',
          true,
          originalError
        ),
        {
          userId: request.userId,
          category: request.category,
          topic: request.topic,
        }
      );
    }
  }

  /**
   * Validate the batch quiz request
   * 
   * @param request - The request to validate
   * @throws Error if request is invalid
   */
  private validateRequest(request: BatchQuizRequest): void {
    if (!request.topic || request.topic.trim().length === 0) {
      throw new Error('Topic is required');
    }

    if (!request.category || request.category.trim().length === 0) {
      throw new Error('Category is required');
    }

    if (request.questionCount < 1 || request.questionCount > 50) {
      throw new Error('Question count must be between 1 and 50');
    }

    if (!request.questionTypes || request.questionTypes.length === 0) {
      throw new Error('At least one question type is required');
    }

    const validTypes: QuestionType[] = ['mcq', 'true-false', 'fill-blank', 'matching', 'rearrange'];
    for (const type of request.questionTypes) {
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid question type: ${type}`);
      }
    }

    if (!['easy', 'medium', 'hard'].includes(request.difficulty)) {
      throw new Error('Difficulty must be easy, medium, or hard');
    }
  }
}

// Export singleton instance
export const batchQuizGenerator = new BatchQuizGenerator();
