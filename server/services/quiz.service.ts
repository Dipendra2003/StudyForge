import { questionService } from "./question.service";
import type { QuestionFilters } from "./question.service";
import type { Question, QuestionType } from "../../shared/quiz-types";

/**
 * QuizService - Core quiz operations
 * 
 * This service provides quiz-specific functionality by wrapping the QuestionService
 * and adding quiz-related business logic.
 */
export class QuizService {
  /**
   * Get questions with filtering by category, difficulty, and type
   * 
   * @param filters - Filters to apply when retrieving questions
   * @returns Array of questions matching the filters
   */
  async getQuestions(filters: QuestionFilters = {}): Promise<Question[]> {
    return await questionService.getQuestions(filters);
  }

  /**
   * Shuffle questions for random question ordering
   * 
   * @param questions - Array of questions to shuffle
   * @returns Shuffled array of questions
   */
  shuffleQuestions(questions: Question[]): Question[] {
    return questionService.shuffleQuestions(questions);
  }

  /**
   * Validate an answer for a question
   * 
   * @param question - The question to validate against
   * @param userAnswer - The user's answer (format depends on question type)
   * @returns True if the answer is correct, false otherwise
   */
  validateAnswer(
    question: Question,
    userAnswer: string | string[] | Record<string, string>
  ): boolean {
    return questionService.validateAnswer(question, userAnswer);
  }

  /**
   * Get a single question by ID
   * 
   * @param id - Question ID
   * @returns Question if found, null otherwise
   */
  async getQuestionById(id: number): Promise<Question | null> {
    return await questionService.getQuestionById(id);
  }

  /**
   * Create a new question
   * 
   * @param data - Question data
   * @returns Created question
   */
  async createQuestion(data: {
    userId: number;
    type: QuestionType;
    question: string;
    questionData: any;
    correctAnswer: string | string[] | Record<string, string>;
    explanation: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tags?: string[];
    hints?: string[];
    isPublic?: boolean;
  }): Promise<Question> {
    return await questionService.createQuestion(data);
  }

  /**
   * Update an existing question
   * 
   * @param id - Question ID
   * @param data - Updated question data
   * @returns Updated question
   */
  async updateQuestion(
    id: number,
    data: {
      question?: string;
      questionData?: any;
      correctAnswer?: string | string[] | Record<string, string>;
      explanation?: string;
      category?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      tags?: string[];
      hints?: string[];
      isPublic?: boolean;
    }
  ): Promise<Question> {
    return await questionService.updateQuestion(id, data);
  }

  /**
   * Delete a question
   * 
   * @param id - Question ID
   */
  async deleteQuestion(id: number): Promise<void> {
    return await questionService.deleteQuestion(id);
  }

  /**
   * Get count of questions matching filters
   * 
   * @param filters - Filters to apply
   * @returns Count of matching questions
   */
  async getQuestionCount(filters: QuestionFilters = {}): Promise<number> {
    return await questionService.getQuestionCount(filters);
  }

  /**
   * Increment usage count for a question
   * 
   * @param id - Question ID
   */
  async incrementUsageCount(id: number): Promise<void> {
    return await questionService.incrementUsageCount(id);
  }

  /**
   * Update average score for a question
   * 
   * @param id - Question ID
   * @param newScore - New score to factor into average (0-1)
   */
  async updateAverageScore(id: number, newScore: number): Promise<void> {
    return await questionService.updateAverageScore(id, newScore);
  }
}

// Export singleton instance
export const quizService = new QuizService();
