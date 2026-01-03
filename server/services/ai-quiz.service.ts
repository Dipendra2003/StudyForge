import { geminiService } from "./gemini";
import { questionService } from "./question.service";
import type { Question, QuestionType, QuestionData } from "../../shared/quiz-types";
import { AIError } from "../utils/ai-errors";
import { Logger, LogCategory } from "../utils/logger";

/**
 * AI-powered quiz service for generating questions and providing assistance
 */
export class AIQuizService {
  /**
   * Generate a single question using AI
   * 
   * @param topic - The topic for the question (takes precedence over category)
   * @param difficulty - Difficulty level (easy, medium, hard)
   * @param type - Type of question to generate
   * @param userId - User ID for logging
   * @param category - Category for the question (default: 'General Knowledge')
   * @returns Generated question
   */
  async generateQuestion(
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    type: QuestionType,
    userId: number,
    category: string = 'General Knowledge'
  ): Promise<Question> {
    // Validate inputs
    if (!topic || topic.trim().length === 0) {
      throw new Error('Topic is required for question generation');
    }
    
    // Validate topic is not just whitespace
    if (topic.trim().length === 0) {
      throw new Error('Topic cannot be empty or whitespace-only');
    }

    try {
      let questionData: QuestionData;
      let correctAnswer: string | string[] | Record<string, string>;
      let question: string;
      let explanation: string;

      switch (type) {
        case 'mcq':
          const mcqResult = await this.generateMCQQuestion(topic, difficulty, userId);
          questionData = mcqResult.questionData;
          correctAnswer = mcqResult.correctAnswer;
          question = mcqResult.question;
          explanation = mcqResult.explanation;
          break;

        case 'true-false':
          const tfResult = await this.generateTrueFalseQuestion(topic, difficulty, userId);
          questionData = tfResult.questionData;
          correctAnswer = tfResult.correctAnswer;
          question = tfResult.question;
          explanation = tfResult.explanation;
          break;

        case 'fill-blank':
          const fbResult = await this.generateFillBlankQuestion(topic, difficulty, userId);
          questionData = fbResult.questionData;
          correctAnswer = fbResult.correctAnswer;
          question = fbResult.question;
          explanation = fbResult.explanation;
          break;

        case 'matching':
          const matchResult = await this.generateMatchingQuestion(topic, difficulty, userId);
          questionData = matchResult.questionData;
          correctAnswer = matchResult.correctAnswer;
          question = matchResult.question;
          explanation = matchResult.explanation;
          break;

        case 'rearrange':
          const rearrangeResult = await this.generateRearrangeQuestion(topic, difficulty, userId);
          questionData = rearrangeResult.questionData;
          correctAnswer = rearrangeResult.correctAnswer;
          question = rearrangeResult.question;
          explanation = rearrangeResult.explanation;
          break;

        default:
          throw new Error(`Unsupported question type: ${type}`);
      }

      // PERFORMANCE FIX: Disabled uniqueness check for AI-generated questions
      // The check was fetching 1000 questions from DB for every question generated
      // AI-generated questions are naturally unique due to randomness in generation
      // If needed in future, implement with caching or database-level duplicate detection

      // Create the question in the database
      const createdQuestion = await questionService.createQuestion({
        userId,
        type,
        question,
        questionData,
        correctAnswer,
        explanation,
        category,
        difficulty,
        tags: [topic],
        hints: [],
        isPublic: true,
      });

      return createdQuestion;
    } catch (error) {
      // Convert to AIError with specific error code and user-friendly message
      const aiError = AIError.fromError(error as Error);
      
      Logger.error(LogCategory.AI, 'Error generating question', error as Error, {
        type,
        topic,
        difficulty,
        userId,
        errorCode: aiError.code,
        retryable: aiError.retryable,
      });
      
      throw aiError;
    }
  }

  /**
   * Generate multiple questions in bulk
   * 
   * @param topic - The topic for the questions (takes precedence over category when provided)
   * @param count - Number of questions to generate
   * @param difficulty - Difficulty level
   * @param userId - User ID for logging
   * @param questionTypes - Types of questions to generate (if not specified, uses all types)
   * @param category - Category for the questions (ONLY used if topic is empty/not provided)
   * @returns Array of generated questions
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
    
    // Validate topic is not empty or whitespace-only
    if (!actualTopic || actualTopic.trim().length === 0) {
      throw new Error('Topic or category must be provided');
    }

    Logger.info(LogCategory.AI, 'Quiz generation requested', {
      providedTopic: topic,
      providedCategory: category,
      actualTopicUsed: actualTopic,
      topicWasProvided: !!(topic && topic.trim().length > 0),
      count,
      difficulty,
      userId,
    });

    // Use generateQuizWithRetry to ensure exact count
    // Pass actualTopic as both topic and category to ensure consistency
    return this.generateQuizWithRetry(actualTopic, count, difficulty, userId, questionTypes, actualTopic);
  }

  /**
   * Generate multiple questions with retry logic to ensure exact count
   * 
   * @param topic - The topic for the questions (MUST be the actual topic to use)
   * @param count - Number of questions to generate
   * @param difficulty - Difficulty level
   * @param userId - User ID for logging
   * @param questionTypes - Types of questions to generate (if not specified, uses all types)
   * @param category - Category for database storage (should match topic when topic is provided)
   * @param maxRetries - Maximum number of retry attempts (default: 1, reduced for faster response)
   * @returns Array of generated questions with exact count
   */
  async generateQuizWithRetry(
    topic: string,
    count: number,
    difficulty: 'easy' | 'medium' | 'hard',
    userId: number,
    questionTypes?: QuestionType[],
    category: string = 'General Knowledge',
    maxRetries: number = 1
  ): Promise<Question[]> {
    const types: QuestionType[] = questionTypes || ['mcq', 'true-false', 'fill-blank', 'matching', 'rearrange'];
    
    // Validate topic is not empty or whitespace-only
    if (!topic || topic.trim().length === 0) {
      throw new Error('Topic cannot be empty or whitespace-only');
    }
    
    // FIX: Use topic as the actual generation subject, not category
    const actualTopic = topic.trim();
    
    // Log start time for performance monitoring
    const startTime = Date.now();
    Logger.info(LogCategory.AI, 'Starting quiz generation', {
      topic,
      count,
      difficulty,
      userId,
      types: types.length,
    });
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const questions: Question[] = [];
      const errors: string[] = [];

      // Generate questions in parallel for better performance
      const generationPromises: Promise<{
        success: boolean;
        question?: Question;
        error?: any;
        index: number;
        type?: QuestionType;
      }>[] = [];
      
      for (let i = 0; i < count; i++) {
        const typeIndex = i % types.length;
        const questionType = types[typeIndex];

        // Create promise for parallel execution
        // FIX: Use actualTopic to ensure questions are generated from the correct topic
        const promise = this.generateQuestion(
          actualTopic,
          difficulty,
          questionType,
          userId,
          category
        ).then(question => {
          return { success: true, question, index: i };
        }).catch(error => {
          console.error(`Failed to generate question ${i + 1}:`, error);
          return { success: false, error, index: i, type: questionType };
        });
        
        generationPromises.push(promise);
      }

      // Wait for all questions to generate in parallel
      const results = await Promise.all(generationPromises);
      
      // Process results
      for (const result of results) {
        if (result.success && result.question) {
          questions.push(result.question);
        } else if (!result.success && result.error) {
          errors.push(`Question ${result.index + 1}: ${result.error.message}`);
          
          // Try to fall back to database questions
          if (result.type) {
            try {
              const fallbackQuestions = await questionService.getQuestions({
                category,
                difficulty,
                questionTypes: [result.type],
                limit: 1,
                isPublic: true,
              });

              if (fallbackQuestions.length > 0) {
                questions.push(fallbackQuestions[0]);
                console.log(`Used fallback question for ${result.type}`);
              }
            } catch (fallbackError) {
              console.error('Fallback to database also failed:', fallbackError);
            }
          }
        }
      }

      const elapsedTime = Date.now() - startTime;
      Logger.info(LogCategory.AI, 'Quiz generation attempt completed', {
        attempt: attempt + 1,
        requestedCount: count,
        generatedCount: questions.length,
        elapsedMs: elapsedTime,
      });

      // Validate that we got the exact count
      if (questions.length === count) {
        // Success! Return the questions
        if (attempt > 0) {
          console.log(`Successfully generated ${count} questions after ${attempt} retry attempt(s) in ${elapsedTime}ms`);
        }
        return questions;
      }

      // If we didn't get the exact count, log and retry
      if (attempt < maxRetries) {
        const backoffMs = 500; // Reduced backoff time for faster retry
        console.warn(
          `Generated ${questions.length} questions but expected ${count}. ` +
          `Retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})...`
        );
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        // Final attempt failed
        if (questions.length === 0) {
          // Create a specific AIError for complete failure
          const aiError = new AIError(
            'GENERATION_FAILED' as any,
            `AI question generation unavailable. Failed to generate any questions after ${maxRetries + 1} attempts. Please try again or use database questions.`,
            true
          );
          
          Logger.error(LogCategory.AI, 'Complete quiz generation failure', aiError, {
            topic,
            count,
            difficulty,
            userId,
            attempts: maxRetries + 1,
            elapsedMs: elapsedTime,
            errors: errors.slice(0, 3), // Log first 3 errors
          });
          
          throw aiError;
        } else {
          // Return what we have with a warning
          Logger.warn(LogCategory.AI, 'Partial quiz generation - returning available questions', {
            topic,
            requestedCount: count,
            generatedCount: questions.length,
            attempts: maxRetries + 1,
            elapsedMs: elapsedTime,
          });
          
          return questions;
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    const aiError = new AIError(
      'UNKNOWN_ERROR' as any,
      'AI question generation unavailable. Please try again or use database questions.',
      true
    );
    throw aiError;
  }

  /**
   * Generate a hint for a question
   * 
   * @param question - The question to generate a hint for
   * @param attemptNumber - Which hint attempt this is (for progressive hints)
   * @returns Hint text
   */
  async generateHint(question: Question, attemptNumber: number = 1): Promise<string> {
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
      const hint = await geminiService.generateContent(prompt, { temperature: 0.7 }, question.userId);
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
      const motivation = await geminiService.generateContent(prompt, { temperature: 0.8, maxOutputTokens: 100 });
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
  async generateDifficultyChangeNotification(
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

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Generate an MCQ question
   */
  private async generateMCQQuestion(
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    userId: number
  ): Promise<{
    question: string;
    questionData: QuestionData;
    correctAnswer: string;
    explanation: string;
  }> {
    const prompt = `Generate EXACTLY ONE ${difficulty} multiple choice question STRICTLY AND EXCLUSIVELY about: "${topic}"

CRITICAL REQUIREMENTS:
1. The question MUST be DIRECTLY related to "${topic}" - NO OTHER TOPICS ALLOWED
2. If "${topic}" is "big data", generate ONLY about big data concepts (NOT cloud computing, NOT databases, NOT networking)
3. If "${topic}" is "Java", generate ONLY about Java programming (NOT Python, NOT C++, NOT general programming)
4. The question content, all options, and explanation MUST focus on "${topic}" ONLY
5. Generate EXACTLY 1 question. Do NOT generate fewer or more.

Create a clear question with EXACTLY 4 options. Make sure:
- The question is clear and unambiguous
- All options are plausible
- Only one option is clearly correct
- Options are roughly the same length
- The correct answer is not always in the same position

Return ONLY a JSON object in this exact format (no additional text):
{
  "question": "Your question text here",
  "options": [
    {"id": "a", "text": "First option"},
    {"id": "b", "text": "Second option"},
    {"id": "c", "text": "Third option"},
    {"id": "d", "text": "Fourth option"}
  ],
  "correctAnswer": "a",
  "explanation": "Brief explanation of why this is correct"
}`;

    const response = await geminiService.generateContent(prompt, { temperature: 0.7 }, userId);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      if (!data.question || !data.options || !data.correctAnswer || !data.explanation) {
        throw new Error('Missing required fields in MCQ response');
      }

      if (data.options.length !== 4) {
        throw new Error('MCQ must have exactly 4 options');
      }

      return {
        question: data.question,
        questionData: {
          options: data.options,
        },
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
      };
    } catch (error) {
      throw new Error(`Failed to parse MCQ response: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a True/False question
   */
  private async generateTrueFalseQuestion(
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    userId: number
  ): Promise<{
    question: string;
    questionData: QuestionData;
    correctAnswer: string;
    explanation: string;
  }> {
    const prompt = `Generate a ${difficulty} true/false question STRICTLY AND EXCLUSIVELY about: "${topic}"

CRITICAL REQUIREMENTS:
1. The statement MUST be DIRECTLY related to "${topic}" - NO OTHER TOPICS ALLOWED
2. If "${topic}" is "big data", generate ONLY about big data concepts (NOT cloud computing, NOT databases, NOT networking)
3. If "${topic}" is "Java", generate ONLY about Java programming (NOT Python, NOT C++, NOT general programming)
4. The statement and explanation MUST focus on "${topic}" ONLY

Create a clear statement that is either true or false. Make sure:
- The statement is unambiguous
- It's not a trick question
- The answer is definitively true or false

Return ONLY a JSON object in this exact format:
{
  "statement": "Your statement here",
  "correctAnswer": "true",
  "explanation": "Brief explanation of why this is true/false"
}`;

    const response = await geminiService.generateContent(prompt, { temperature: 0.7 }, userId);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      if (!data.statement || !data.correctAnswer || !data.explanation) {
        throw new Error('Missing required fields in True/False response');
      }

      return {
        question: data.statement,
        questionData: {
          statement: data.statement,
        },
        correctAnswer: data.correctAnswer.toLowerCase(),
        explanation: data.explanation,
      };
    } catch (error) {
      throw new Error(`Failed to parse True/False response: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a Fill-in-the-Blank question
   */
  private async generateFillBlankQuestion(
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    userId: number
  ): Promise<{
    question: string;
    questionData: QuestionData;
    correctAnswer: string[];
    explanation: string;
  }> {
    const prompt = `Generate a ${difficulty} fill-in-the-blank question STRICTLY AND EXCLUSIVELY about: "${topic}"

CRITICAL REQUIREMENTS:
1. The question MUST be DIRECTLY related to "${topic}" - NO OTHER TOPICS ALLOWED
2. If "${topic}" is "big data", generate ONLY about big data concepts (NOT cloud computing, NOT databases, NOT networking)
3. If "${topic}" is "Java", generate ONLY about Java programming (NOT Python, NOT C++, NOT general programming)
4. The sentence and blanks MUST focus on "${topic}" ONLY

IMPORTANT: Generate questions EXCLUSIVELY from the topic "${topic}". Do not deviate from this topic.

Create a sentence with 1-3 blanks (use ___ for blanks). Make sure:
- The blanks test important concepts
- The answers are specific words or short phrases
- The sentence makes sense with the blanks filled in

Return ONLY a JSON object in this exact format:
{
  "template": "The capital of France is ___",
  "blanks": [
    {"id": "blank1", "position": 0, "correctAnswer": "Paris", "caseSensitive": false}
  ],
  "explanation": "Brief explanation"
}`;

    const response = await geminiService.generateContent(prompt, { temperature: 0.7 }, userId);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      if (!data.template || !data.blanks || !data.explanation) {
        throw new Error('Missing required fields in Fill-in-the-Blank response');
      }

      const correctAnswers = data.blanks.map((blank: any) => blank.correctAnswer);

      return {
        question: data.template,
        questionData: {
          template: data.template,
          blanks: data.blanks,
        },
        correctAnswer: correctAnswers,
        explanation: data.explanation,
      };
    } catch (error) {
      throw new Error(`Failed to parse Fill-in-the-Blank response: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a Matching question
   */
  private async generateMatchingQuestion(
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    userId: number
  ): Promise<{
    question: string;
    questionData: QuestionData;
    correctAnswer: Record<string, string>;
    explanation: string;
  }> {
    const prompt = `Generate a ${difficulty} matching question STRICTLY AND EXCLUSIVELY about: "${topic}"

CRITICAL REQUIREMENTS:
1. ALL items MUST be DIRECTLY related to "${topic}" - NO OTHER TOPICS ALLOWED
2. If "${topic}" is "big data", generate ONLY about big data concepts (NOT cloud computing, NOT databases, NOT networking)
3. If "${topic}" is "Java", generate ONLY about Java programming (NOT Python, NOT C++, NOT general programming)
4. Both columns and all matches MUST focus on "${topic}" ONLY

Create two columns of 4 items each that need to be matched. Make sure:
- Items in each column are related but distinct
- There's a clear correct pairing for each item
- The matches test understanding of relationships

Return ONLY a JSON object in this exact format:
{
  "question": "Match the following items",
  "leftColumn": [
    {"id": "l1", "text": "Item 1"},
    {"id": "l2", "text": "Item 2"},
    {"id": "l3", "text": "Item 3"},
    {"id": "l4", "text": "Item 4"}
  ],
  "rightColumn": [
    {"id": "r1", "text": "Match 1"},
    {"id": "r2", "text": "Match 2"},
    {"id": "r3", "text": "Match 3"},
    {"id": "r4", "text": "Match 4"}
  ],
  "correctPairs": [["l1", "r1"], ["l2", "r2"], ["l3", "r3"], ["l4", "r4"]],
  "explanation": "Brief explanation of the matches"
}`;

    const response = await geminiService.generateContent(prompt, { temperature: 0.7 }, userId);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      if (!data.question || !data.leftColumn || !data.rightColumn || !data.correctPairs || !data.explanation) {
        throw new Error('Missing required fields in Matching response');
      }

      // Convert correctPairs array to object format
      const correctAnswer: Record<string, string> = {};
      for (const [leftId, rightId] of data.correctPairs) {
        correctAnswer[leftId] = rightId;
      }

      return {
        question: data.question,
        questionData: {
          leftColumn: data.leftColumn,
          rightColumn: data.rightColumn,
          correctPairs: data.correctPairs,
        },
        correctAnswer,
        explanation: data.explanation,
      };
    } catch (error) {
      throw new Error(`Failed to parse Matching response: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a Rearrange question
   */
  private async generateRearrangeQuestion(
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    userId: number
  ): Promise<{
    question: string;
    questionData: QuestionData;
    correctAnswer: string | string[] | Record<string, string>;
    explanation: string;
  }> {
    const prompt = `Generate a ${difficulty} rearranging question STRICTLY AND EXCLUSIVELY about: "${topic}"

CRITICAL REQUIREMENTS:
1. ALL items MUST be DIRECTLY related to "${topic}" - NO OTHER TOPICS ALLOWED
2. If "${topic}" is "big data", generate ONLY about big data concepts (NOT cloud computing, NOT databases, NOT networking)
3. If "${topic}" is "Java", generate ONLY about Java programming (NOT Python, NOT C++, NOT general programming)
4. The items and their order MUST focus on "${topic}" ONLY

Create 4-6 items that need to be arranged in the correct order. Make sure:
- The items have a clear logical order (chronological, process steps, size, etc.)
- The order tests understanding of the concept
- Items are distinct and unambiguous

Return ONLY a JSON object in this exact format:
{
  "question": "Arrange these items in the correct order",
  "items": ["Item 1", "Item 2", "Item 3", "Item 4"],
  "correctOrder": [2, 0, 3, 1],
  "explanation": "Brief explanation of the correct order"
}

Note: correctOrder should be an array of indices (0-based) representing the correct sequence.`;

    const response = await geminiService.generateContent(prompt, { temperature: 0.7 }, userId);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      if (!data.question || !data.items || !data.correctOrder || !data.explanation) {
        throw new Error('Missing required fields in Rearrange response');
      }

      return {
        question: data.question,
        questionData: {
          items: data.items,
          correctOrder: data.correctOrder,
        },
        correctAnswer: data.correctOrder as unknown as string | string[] | Record<string, string>,
        explanation: data.explanation,
      };
    } catch (error) {
      throw new Error(`Failed to parse Rearrange response: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a question already exists in the database
   * 
   * DEPRECATED: This method was causing severe performance issues by fetching
   * 1000 questions from the database for every question generated.
   * AI-generated questions are naturally unique due to randomness.
   * If duplicate detection is needed, implement with database-level checks or caching.
   */
  private async checkQuestionUniqueness(questionText: string): Promise<boolean> {
    // Always return false (no duplicate) to skip the expensive check
    return false;
  }
}

// Export singleton instance
export const aiQuizService = new AIQuizService();
