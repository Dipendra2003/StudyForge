import { db } from "../db";
import { questions } from "../../shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import type {
  Question,
  QuestionType,
  QuestionData,
  createQuestionSchema,
  updateQuestionSchema,
} from "../../shared/quiz-types";
import {
  validateQuestion,
  validateMCQData,
  validateTrueFalseData,
  validateFillBlankData,
  validateMatchingData,
  validateRearrangeData,
  isMCQData,
  isTrueFalseData,
  isFillBlankData,
  isMatchingData,
  isRearrangeData,
} from "../../shared/quiz-types";

// ===== TYPES =====

export interface QuestionFilters {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionTypes?: QuestionType[];
  limit?: number;
  excludeIds?: number[];
  userId?: number;
  isPublic?: boolean;
}

export interface CreateQuestionDTO {
  userId: number;
  type: QuestionType;
  question: string;
  questionData: QuestionData;
  correctAnswer: string | string[] | number[] | Record<string, string>;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  hints?: string[];
  isPublic?: boolean;
}

export interface UpdateQuestionDTO {
  question?: string;
  questionData?: QuestionData;
  correctAnswer?: string | string[] | Record<string, string>;
  explanation?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  hints?: string[];
  isPublic?: boolean;
}

// ===== QUESTION SERVICE =====

export class QuestionService {
  /**
   * Get questions with optional filters
   */
  async getQuestions(filters: QuestionFilters = {}): Promise<Question[]> {
    const conditions = [];

    if (filters.category) {
      conditions.push(eq(questions.category, filters.category));
    }

    if (filters.difficulty) {
      conditions.push(eq(questions.difficulty, filters.difficulty));
    }

    if (filters.questionTypes && filters.questionTypes.length > 0) {
      conditions.push(inArray(questions.type, filters.questionTypes));
    }

    if (filters.excludeIds && filters.excludeIds.length > 0) {
      conditions.push(sql`${questions.id} NOT IN ${filters.excludeIds}`);
    }

    if (filters.userId !== undefined) {
      conditions.push(eq(questions.userId, filters.userId));
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(questions.isPublic, filters.isPublic));
    }

    let query = db.select().from(questions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }

    const results = await query;

    // Parse JSON fields
    return results.map(this.parseQuestionFromDB);
  }

  /**
   * Get a single question by ID
   */
  async getQuestionById(id: number): Promise<Question | null> {
    const result = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.parseQuestionFromDB(result[0]);
  }

  /**
   * Create a new question
   */
  async createQuestion(data: CreateQuestionDTO): Promise<Question> {
    // Validate the question data
    const validation = this.validateQuestionData(data.type, data.questionData);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    // Prepare data for insertion
    const insertData = {
      userId: data.userId,
      type: data.type,
      question: data.question,
      questionData: data.questionData,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      category: data.category,
      difficulty: data.difficulty,
      tags: data.tags || [],
      hints: data.hints || [],
      isPublic: data.isPublic || false,
      usageCount: 0,
      averageScore: 0,
    };

    const result = await db.insert(questions).values(insertData);

    // Handle different database driver return formats
    let questionId: number;
    
    // Check for insertId (PostgreSQL)
    if (result && typeof (result as any).insertId !== 'undefined') {
      const insertId = (result as any).insertId;
      questionId = typeof insertId === 'bigint' ? Number(insertId) : Number(insertId);
    } 
    // Check for returning clause result (PostgreSQL style)
    else if (Array.isArray(result) && result.length > 0 && (result[0] as any)?.id) {
      questionId = (result[0] as any).id;
    }
    // Fallback: query for the last inserted question by this user
    else {
      const lastQuestion = await db
        .select()
        .from(questions)
        .where(eq(questions.userId, data.userId))
        .orderBy(sql`${questions.id} DESC`)
        .limit(1);
      
      if (lastQuestion.length > 0) {
        questionId = lastQuestion[0].id;
      } else {
        throw new Error('Failed to retrieve created question ID');
      }
    }
    
    // Validate the ID is a valid number
    if (isNaN(questionId) || questionId <= 0) {
      throw new Error(`Invalid question ID returned from database: ${questionId}`);
    }
    
    const createdQuestion = await this.getQuestionById(questionId);
    
    if (!createdQuestion) {
      throw new Error('Failed to create question');
    }

    return createdQuestion;
  }

  /**
   * Update an existing question
   */
  async updateQuestion(id: number, data: UpdateQuestionDTO): Promise<Question> {
    // Get existing question
    const existing = await this.getQuestionById(id);
    if (!existing) {
      throw new Error('Question not found');
    }

    // If questionData is being updated, validate it
    if (data.questionData) {
      const validation = this.validateQuestionData(existing.type, data.questionData);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.question !== undefined) updateData.question = data.question;
    if (data.questionData !== undefined) updateData.questionData = data.questionData;
    if (data.correctAnswer !== undefined) updateData.correctAnswer = data.correctAnswer;
    if (data.explanation !== undefined) updateData.explanation = data.explanation;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.hints !== undefined) updateData.hints = data.hints;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    await db.update(questions).set(updateData).where(eq(questions.id, id));

    // Fetch updated question
    const updatedQuestion = await this.getQuestionById(id);
    
    if (!updatedQuestion) {
      throw new Error('Failed to update question');
    }

    return updatedQuestion;
  }

  /**
   * Delete a question
   */
  async deleteQuestion(id: number): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  /**
   * Increment usage count for a question
   */
  async incrementUsageCount(id: number): Promise<void> {
    await db
      .update(questions)
      .set({
        usageCount: sql`${questions.usageCount} + 1`,
      })
      .where(eq(questions.id, id));
  }

  /**
   * Update average score for a question
   */
  async updateAverageScore(id: number, newScore: number): Promise<void> {
    const question = await this.getQuestionById(id);
    if (!question) {
      throw new Error('Question not found');
    }

    // Calculate new average: (oldAvg * count + newScore) / (count + 1)
    const oldAverage = question.averageScore;
    const count = question.usageCount;
    const newAverage = Math.round(((oldAverage * count) + (newScore * 100)) / (count + 1));

    await db
      .update(questions)
      .set({
        averageScore: newAverage,
      })
      .where(eq(questions.id, id));
  }

  /**
   * Get question count matching filters
   */
  async getQuestionCount(filters: QuestionFilters = {}): Promise<number> {
    const conditions = [];

    if (filters.category) {
      conditions.push(eq(questions.category, filters.category));
    }

    if (filters.difficulty) {
      conditions.push(eq(questions.difficulty, filters.difficulty));
    }

    if (filters.questionTypes && filters.questionTypes.length > 0) {
      conditions.push(inArray(questions.type, filters.questionTypes));
    }

    if (filters.userId !== undefined) {
      conditions.push(eq(questions.userId, filters.userId));
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(questions.isPublic, filters.isPublic));
    }

    let query = db.select({ count: sql<number>`count(*)` }).from(questions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    return result[0]?.count || 0;
  }

  /**
   * Shuffle an array of questions
   */
  shuffleQuestions(questions: Question[]): Question[] {
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Validate an answer for a question
   */
  validateAnswer(question: Question, userAnswer: string | string[] | Record<string, string>): boolean {
    switch (question.type) {
      case 'mcq':
        return this.validateMCQAnswer(question, userAnswer as string);
      
      case 'true-false':
        return this.validateTrueFalseAnswer(question, userAnswer as string);
      
      case 'fill-blank':
        return this.validateFillBlankAnswer(question, userAnswer as string[]);
      
      case 'matching':
        return this.validateMatchingAnswer(question, userAnswer as Record<string, string>);
      
      case 'rearrange':
        return this.validateRearrangeAnswer(question, userAnswer as unknown as number[]);
      
      default:
        return false;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Parse question from database result
   */
  private parseQuestionFromDB(dbQuestion: any): Question {
    return {
      id: dbQuestion.id,
      userId: dbQuestion.userId,
      type: dbQuestion.type,
      question: dbQuestion.question,
      questionData: dbQuestion.questionData,
      correctAnswer: dbQuestion.correctAnswer,
      explanation: dbQuestion.explanation,
      category: dbQuestion.category,
      difficulty: dbQuestion.difficulty,
      tags: dbQuestion.tags || [],
      hints: dbQuestion.hints || [],
      isPublic: dbQuestion.isPublic,
      usageCount: dbQuestion.usageCount,
      averageScore: dbQuestion.averageScore / 100, // Convert back from stored value
      createdAt: dbQuestion.createdAt,
      updatedAt: dbQuestion.updatedAt,
    };
  }

  /**
   * Validate question data based on type
   */
  private validateQuestionData(type: QuestionType, data: QuestionData): {
    success: boolean;
    errors?: string[];
  } {
    switch (type) {
      case 'mcq':
        return isMCQData(data) ? validateMCQData(data) : { success: false, errors: ['Invalid MCQ data'] };
      
      case 'true-false':
        return isTrueFalseData(data) ? validateTrueFalseData(data) : { success: false, errors: ['Invalid True/False data'] };
      
      case 'fill-blank':
        return isFillBlankData(data) ? validateFillBlankData(data) : { success: false, errors: ['Invalid Fill-in-the-Blank data'] };
      
      case 'matching':
        return isMatchingData(data) ? validateMatchingData(data) : { success: false, errors: ['Invalid Matching data'] };
      
      case 'rearrange':
        return isRearrangeData(data) ? validateRearrangeData(data) : { success: false, errors: ['Invalid Rearrange data'] };
      
      default:
        return { success: false, errors: ['Unknown question type'] };
    }
  }

  /**
   * Validate MCQ answer
   */
  private validateMCQAnswer(question: Question, userAnswer: string): boolean {
    return userAnswer === question.correctAnswer;
  }

  /**
   * Validate True/False answer
   */
  private validateTrueFalseAnswer(question: Question, userAnswer: string): boolean {
    return userAnswer.toLowerCase() === (question.correctAnswer as string).toLowerCase();
  }

  /**
   * Validate Fill-in-the-Blank answer
   */
  private validateFillBlankAnswer(question: Question, userAnswers: string[]): boolean {
    const correctAnswers = question.correctAnswer as string[];
    
    if (userAnswers.length !== correctAnswers.length) {
      return false;
    }

    const questionData = question.questionData as any;
    const blanks = questionData.blanks || [];

    for (let i = 0; i < correctAnswers.length; i++) {
      const blank = blanks[i];
      const caseSensitive = blank?.caseSensitive || false;
      
      const userAns = caseSensitive ? userAnswers[i] : userAnswers[i].toLowerCase();
      const correctAns = caseSensitive ? correctAnswers[i] : correctAnswers[i].toLowerCase();
      
      if (userAns.trim() !== correctAns.trim()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate Matching answer
   */
  private validateMatchingAnswer(question: Question, userPairs: Record<string, string>): boolean {
    const correctPairs = question.correctAnswer as Record<string, string>;
    
    // Check if all correct pairs are present
    for (const [leftId, rightId] of Object.entries(correctPairs)) {
      if (userPairs[leftId] !== rightId) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate Rearrange answer
   */
  private validateRearrangeAnswer(question: Question, userOrder: number[]): boolean {
    const correctOrder = question.correctAnswer as unknown as number[];
    
    if (userOrder.length !== correctOrder.length) {
      return false;
    }

    return JSON.stringify(userOrder) === JSON.stringify(correctOrder);
  }
}

// Export singleton instance
export const questionService = new QuestionService();
