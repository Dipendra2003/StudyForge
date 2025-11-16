import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { handleApiError } from "./errorHandler";

// Validation schema for flashcard updates
export const flashcardUpdateSchema = z.object({
  question: z.string().min(1, "Question cannot be empty").max(5000, "Question is too long").optional(),
  answer: z.string().min(1, "Answer cannot be empty").max(5000, "Answer is too long").optional(),
  questionImage: z.string().max(10485760, "Question image is too large (max 10MB)").optional().nullable(),
  answerImage: z.string().max(10485760, "Answer image is too large (max 10MB)").optional().nullable(),
  category: z.string().max(50, "Category name is too long").optional().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"], {
    errorMap: () => ({ message: "Difficulty must be 'easy', 'medium', or 'hard'" })
  }).optional(),
  tags: z.array(z.string().max(50)).max(10, "Maximum 10 tags allowed").optional().nullable(),
  repetitionInterval: z.number().int().min(0).optional(),
  easeFactor: z.number().int().min(130).max(500).optional(),
  lastReviewed: z.date().optional().nullable(),
  nextReviewDate: z.date().optional().nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

// Middleware to validate flashcard update requests
export const validateFlashcardUpdate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse and validate the request body
    const validatedData = flashcardUpdateSchema.parse(req.body);
    
    // Replace request body with validated data
    req.body = validatedData;
    
    next();
  } catch (error) {
    return handleApiError(error, res);
  }
};
