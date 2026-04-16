import { z } from 'zod';

/**
 * Validation schemas for admin forms
 */

// User Edit Form Schema
export const userEditSchema = z.object({
  fullName: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: 'Role must be either "user" or "admin"' }),
  }),
});

export type UserEditFormData = z.infer<typeof userEditSchema>;

// Content Edit Form Schema (Generic)
export const contentEditSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .optional(),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: 'Difficulty must be easy, medium, or hard' }),
  }).optional(),
});

export type ContentEditFormData = z.infer<typeof contentEditSchema>;

// Quiz Edit Form Schema
export const quizEditSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .optional(),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: 'Difficulty must be easy, medium, or hard' }),
  }).optional(),
  timeLimit: z.number()
    .int('Time limit must be a whole number')
    .min(0, 'Time limit cannot be negative')
    .max(3600, 'Time limit cannot exceed 3600 seconds')
    .optional(),
});

export type QuizEditFormData = z.infer<typeof quizEditSchema>;

// Flashcard Edit Form Schema
export const flashcardEditSchema = z.object({
  question: z.string()
    .min(1, 'Question is required')
    .max(1000, 'Question must be less than 1000 characters'),
  answer: z.string()
    .min(1, 'Answer is required')
    .max(2000, 'Answer must be less than 2000 characters'),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: 'Difficulty must be easy, medium, or hard' }),
  }).optional(),
});

export type FlashcardEditFormData = z.infer<typeof flashcardEditSchema>;

// Document Edit Form Schema
export const documentEditSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters'),
  status: z.enum(['pending', 'processing', 'completed', 'failed'], {
    errorMap: () => ({ message: 'Invalid status value' }),
  }).optional(),
});

export type DocumentEditFormData = z.infer<typeof documentEditSchema>;

// Question Edit Form Schema
export const questionEditSchema = z.object({
  question: z.string()
    .min(1, 'Question is required')
    .max(1000, 'Question must be less than 1000 characters'),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer'], {
    errorMap: () => ({ message: 'Invalid question type' }),
  }),
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: 'Difficulty must be easy, medium, or hard' }),
  }).optional(),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
    .optional(),
});

export type QuestionEditFormData = z.infer<typeof questionEditSchema>;

// Message Status Update Form Schema
export const messageStatusSchema = z.object({
  status: z.enum(['pending', 'read', 'resolved'], {
    errorMap: () => ({ message: 'Status must be pending, read, or resolved' }),
  }),
});

export type MessageStatusFormData = z.infer<typeof messageStatusSchema>;

// User Search Form Schema
export const userSearchSchema = z.object({
  query: z.string()
    .max(255, 'Search query must be less than 255 characters')
    .optional(),
  role: z.enum(['all', 'user', 'admin'], {
    errorMap: () => ({ message: 'Invalid role filter' }),
  }).optional(),
  status: z.enum(['all', 'active', 'suspended'], {
    errorMap: () => ({ message: 'Invalid status filter' }),
  }).optional(),
});

export type UserSearchFormData = z.infer<typeof userSearchSchema>;

// Content Search Form Schema
export const contentSearchSchema = z.object({
  query: z.string()
    .max(255, 'Search query must be less than 255 characters')
    .optional(),
  category: z.string()
    .max(50, 'Category must be less than 50 characters')
    .optional(),
  userId: z.number()
    .int('User ID must be a whole number')
    .positive('User ID must be positive')
    .optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export type ContentSearchFormData = z.infer<typeof contentSearchSchema>;

// Date Range Filter Schema
export const dateRangeSchema = z.object({
  startDate: z.date({
    required_error: 'Start date is required',
    invalid_type_error: 'Invalid start date',
  }),
  endDate: z.date({
    required_error: 'End date is required',
    invalid_type_error: 'Invalid end date',
  }),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
});

export type DateRangeFormData = z.infer<typeof dateRangeSchema>;

// Pagination Schema
export const paginationSchema = z.object({
  page: z.number()
    .int('Page must be a whole number')
    .min(1, 'Page must be at least 1'),
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50'),
});

export type PaginationFormData = z.infer<typeof paginationSchema>;
