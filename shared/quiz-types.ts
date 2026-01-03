import { z } from "zod";

// ===== QUESTION TYPES =====

export type QuestionType = 'mcq' | 'true-false' | 'fill-blank' | 'matching' | 'rearrange';

// ===== TYPE-SPECIFIC DATA STRUCTURES =====

// MCQ (Multiple Choice Question) Data
export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean; // Used internally, not exposed to frontend
}

export interface MCQData {
  options: QuestionOption[];
}

export const mcqDataSchema = z.object({
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean().optional(),
  })).min(2, "MCQ must have at least 2 options").max(6, "MCQ must have at most 6 options"),
});

// True/False Data
export interface TrueFalseData {
  statement: string;
}

export const trueFalseDataSchema = z.object({
  statement: z.string().min(1, "Statement is required"),
});

// Fill in the Blank Data
export interface BlankField {
  id: string;
  position: number;
  correctAnswer: string;
  caseSensitive?: boolean;
}

export interface FillBlankData {
  template: string; // Text with placeholders like "The capital of France is ___"
  blanks: BlankField[];
}

export const fillBlankDataSchema = z.object({
  template: z.string().min(1, "Template is required"),
  blanks: z.array(z.object({
    id: z.string(),
    position: z.number(),
    correctAnswer: z.string(),
    caseSensitive: z.boolean().optional(),
  })).min(1, "At least one blank is required"),
});

// Matching Data
export interface MatchItem {
  id: string;
  text: string;
}

export interface MatchingData {
  leftColumn: MatchItem[];
  rightColumn: MatchItem[];
  correctPairs: [string, string][]; // Array of [leftId, rightId] pairs
}

export const matchingDataSchema = z.object({
  leftColumn: z.array(z.object({
    id: z.string(),
    text: z.string(),
  })).min(2, "At least 2 items required in left column"),
  rightColumn: z.array(z.object({
    id: z.string(),
    text: z.string(),
  })).min(2, "At least 2 items required in right column"),
  correctPairs: z.array(z.tuple([z.string(), z.string()])).min(1, "At least one correct pair required"),
});

// Rearrange Data
export interface RearrangeData {
  items: string[];
  correctOrder: number[]; // Array of indices representing correct order
}

export const rearrangeDataSchema = z.object({
  items: z.array(z.string()).min(2, "At least 2 items required for rearranging"),
  correctOrder: z.array(z.number()).min(2, "Correct order must be specified"),
});

// Union type for all question data types
export type QuestionData = MCQData | TrueFalseData | FillBlankData | MatchingData | RearrangeData;

// ===== QUESTION MODEL =====

export interface Question {
  id: number;
  userId: number;
  type: QuestionType;
  question: string;
  questionData: QuestionData;
  correctAnswer: string | string[] | Record<string, string>;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  hints: string[];
  isPublic: boolean;
  usageCount: number;
  averageScore: number;
  createdAt: Date;
  updatedAt: Date;
}

// ===== VALIDATION SCHEMAS =====

// Base question schema
const baseQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  explanation: z.string().min(1, "Explanation is required"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string()).optional().default([]),
  hints: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().optional().default(false),
});

// MCQ Question Schema
export const mcqQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("mcq"),
  questionData: mcqDataSchema,
  correctAnswer: z.string(), // ID of the correct option
});

// True/False Question Schema
export const trueFalseQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("true-false"),
  questionData: trueFalseDataSchema,
  correctAnswer: z.enum(["true", "false"]),
});

// Fill in the Blank Question Schema
export const fillBlankQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("fill-blank"),
  questionData: fillBlankDataSchema,
  correctAnswer: z.array(z.string()), // Array of correct answers for each blank
});

// Matching Question Schema
export const matchingQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("matching"),
  questionData: matchingDataSchema,
  correctAnswer: z.record(z.string(), z.string()), // Object mapping leftId to rightId
});

// Rearrange Question Schema
export const rearrangeQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("rearrange"),
  questionData: rearrangeDataSchema,
  correctAnswer: z.array(z.number()), // Array of indices in correct order
});

// Discriminated union for all question types
export const questionSchema = z.discriminatedUnion("type", [
  mcqQuestionSchema,
  trueFalseQuestionSchema,
  fillBlankQuestionSchema,
  matchingQuestionSchema,
  rearrangeQuestionSchema,
]);

// Create question input schema (without id, userId, timestamps, usage stats)
export const createQuestionSchema = questionSchema;

// Update question input schema (partial fields, type cannot be changed)
export const updateQuestionSchema = z.union([
  mcqQuestionSchema.partial().omit({ type: true }),
  trueFalseQuestionSchema.partial().omit({ type: true }),
  fillBlankQuestionSchema.partial().omit({ type: true }),
  matchingQuestionSchema.partial().omit({ type: true }),
  rearrangeQuestionSchema.partial().omit({ type: true }),
]);

// ===== VALIDATION FUNCTIONS =====

/**
 * Validates a question based on its type
 * @param question - The question to validate
 * @returns Validation result with success flag and errors if any
 */
export function validateQuestion(question: Partial<Question>): {
  success: boolean;
  errors?: string[];
} {
  try {
    questionSchema.parse(question);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      success: false,
      errors: ['Unknown validation error'],
    };
  }
}

/**
 * Validates MCQ-specific requirements
 * @param data - MCQ question data
 * @returns Validation result
 */
export function validateMCQData(data: MCQData): {
  success: boolean;
  errors?: string[];
} {
  const errors: string[] = [];
  
  // Check option count (2-6 options)
  if (data.options.length < 2) {
    errors.push("MCQ must have at least 2 options");
  }
  if (data.options.length > 6) {
    errors.push("MCQ must have at most 6 options");
  }
  
  // Check for duplicate option texts
  const optionTexts = data.options.map(opt => opt.text.toLowerCase().trim());
  const uniqueTexts = new Set(optionTexts);
  if (uniqueTexts.size !== optionTexts.length) {
    errors.push("MCQ options must be unique");
  }
  
  // Check that all options have text
  if (data.options.some(opt => !opt.text || opt.text.trim() === '')) {
    errors.push("All MCQ options must have text");
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validates True/False-specific requirements
 * @param data - True/False question data
 * @returns Validation result
 */
export function validateTrueFalseData(data: TrueFalseData): {
  success: boolean;
  errors?: string[];
} {
  const errors: string[] = [];
  
  if (!data.statement || data.statement.trim() === '') {
    errors.push("True/False statement is required");
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validates Fill-in-the-Blank-specific requirements
 * @param data - Fill-in-the-blank question data
 * @returns Validation result
 */
export function validateFillBlankData(data: FillBlankData): {
  success: boolean;
  errors?: string[];
} {
  const errors: string[] = [];
  
  if (!data.template || data.template.trim() === '') {
    errors.push("Fill-in-the-blank template is required");
  }
  
  if (data.blanks.length === 0) {
    errors.push("At least one blank is required");
  }
  
  // Check that all blanks have correct answers
  if (data.blanks.some(blank => !blank.correctAnswer || blank.correctAnswer.trim() === '')) {
    errors.push("All blanks must have correct answers");
  }
  
  // Check for duplicate positions
  const positions = data.blanks.map(b => b.position);
  const uniquePositions = new Set(positions);
  if (uniquePositions.size !== positions.length) {
    errors.push("Blank positions must be unique");
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validates Matching-specific requirements
 * @param data - Matching question data
 * @returns Validation result
 */
export function validateMatchingData(data: MatchingData): {
  success: boolean;
  errors?: string[];
} {
  const errors: string[] = [];
  
  if (data.leftColumn.length < 2) {
    errors.push("Matching question must have at least 2 items in left column");
  }
  
  if (data.rightColumn.length < 2) {
    errors.push("Matching question must have at least 2 items in right column");
  }
  
  if (data.correctPairs.length === 0) {
    errors.push("At least one correct pair is required");
  }
  
  // Check that all pair IDs exist in columns
  const leftIds = new Set(data.leftColumn.map(item => item.id));
  const rightIds = new Set(data.rightColumn.map(item => item.id));
  
  for (const [leftId, rightId] of data.correctPairs) {
    if (!leftIds.has(leftId)) {
      errors.push(`Invalid left column ID in pair: ${leftId}`);
    }
    if (!rightIds.has(rightId)) {
      errors.push(`Invalid right column ID in pair: ${rightId}`);
    }
  }
  
  // Check for duplicate items
  const leftTexts = data.leftColumn.map(item => item.text.toLowerCase().trim());
  const rightTexts = data.rightColumn.map(item => item.text.toLowerCase().trim());
  
  if (new Set(leftTexts).size !== leftTexts.length) {
    errors.push("Left column items must be unique");
  }
  
  if (new Set(rightTexts).size !== rightTexts.length) {
    errors.push("Right column items must be unique");
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validates Rearrange-specific requirements
 * @param data - Rearrange question data
 * @returns Validation result
 */
export function validateRearrangeData(data: RearrangeData): {
  success: boolean;
  errors?: string[];
} {
  const errors: string[] = [];
  
  if (data.items.length < 2) {
    errors.push("Rearrange question must have at least 2 items");
  }
  
  if (data.correctOrder.length !== data.items.length) {
    errors.push("Correct order must have same length as items");
  }
  
  // Check that correctOrder is a valid permutation
  const sortedOrder = [...data.correctOrder].sort((a, b) => a - b);
  const expectedOrder = Array.from({ length: data.items.length }, (_, i) => i);
  
  if (JSON.stringify(sortedOrder) !== JSON.stringify(expectedOrder)) {
    errors.push("Correct order must be a valid permutation of item indices");
  }
  
  // Check for duplicate items
  const itemTexts = data.items.map(item => item.toLowerCase().trim());
  if (new Set(itemTexts).size !== itemTexts.length) {
    errors.push("Rearrange items must be unique");
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Type guard to check if question data is MCQ
 */
export function isMCQData(data: QuestionData): data is MCQData {
  return 'options' in data;
}

/**
 * Type guard to check if question data is True/False
 */
export function isTrueFalseData(data: QuestionData): data is TrueFalseData {
  return 'statement' in data;
}

/**
 * Type guard to check if question data is Fill-in-the-Blank
 */
export function isFillBlankData(data: QuestionData): data is FillBlankData {
  return 'template' in data && 'blanks' in data;
}

/**
 * Type guard to check if question data is Matching
 */
export function isMatchingData(data: QuestionData): data is MatchingData {
  return 'leftColumn' in data && 'rightColumn' in data && 'correctPairs' in data;
}

/**
 * Type guard to check if question data is Rearrange
 */
export function isRearrangeData(data: QuestionData): data is RearrangeData {
  return 'items' in data && 'correctOrder' in data;
}
