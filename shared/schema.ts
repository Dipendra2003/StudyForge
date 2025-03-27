import { pgTable, text, serial, boolean, timestamp, integer, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  profilePicture: text("profile_picture"),
  preferredLanguage: text("preferred_language").default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Waitlist for marketing
export const waitlistEntries = pgTable("waitlist_entries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  company: text("company"),
  consent: boolean("consent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Study Sessions and Notes
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  fileType: text("file_type"),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Flashcards created from documents
export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  documentId: integer("document_id"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  tags: text("tags").array(),
  lastReviewed: timestamp("last_reviewed"),
  nextReviewDate: timestamp("next_review_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// MCQs for quizzes
export const mcqs = pgTable("mcqs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  documentId: integer("document_id"),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  correctOption: integer("correct_option").notNull(),
  explanation: text("explanation"),
  difficulty: text("difficulty").notNull().default("medium"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User's quiz attempts
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  questionsData: jsonb("questions_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI generated code snippets
export const codeSnippets = pgTable("code_snippets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  problem: text("problem"),
  code: text("code").notNull(),
  language: text("language").notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Study planning
export const studyPlans = pgTable("study_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  scheduleData: jsonb("schedule_data"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completedPercentage: integer("completed_percentage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat history for AI interactions
export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  messages: jsonb("messages").notNull(),
  subject: text("subject"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User badges and achievements
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  badge: text("badge").notNull(),
  description: text("description"),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// User statistics and progress tracking
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  totalStudyTime: integer("total_study_time").default(0),
  quizzesCompleted: integer("quizzes_completed").default(0),
  averageScore: integer("average_score").default(0),
  documentsUploaded: integer("documents_uploaded").default(0),
  flashcardsCreated: integer("flashcards_created").default(0),
  codeSnippetsGenerated: integer("code_snippets_generated").default(0),
  questionsAsked: integer("questions_asked").default(0),
  streakDays: integer("streak_days").default(0),
  lastActive: timestamp("last_active").defaultNow(),
});

// Define insertion schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  preferredLanguage: true,
});

export const insertWaitlistSchema = createInsertSchema(waitlistEntries).pick({
  name: true,
  email: true,
  company: true,
  consent: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  userId: true,
  title: true,
  content: true,
  fileUrl: true,
  fileType: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).pick({
  userId: true,
  documentId: true,
  question: true,
  answer: true,
  tags: true,
});

export const insertMcqSchema = createInsertSchema(mcqs).pick({
  userId: true,
  documentId: true,
  question: true,
  options: true,
  correctOption: true,
  explanation: true,
  difficulty: true,
  category: true,
});

export const insertCodeSnippetSchema = createInsertSchema(codeSnippets).pick({
  userId: true,
  title: true,
  problem: true,
  code: true,
  language: true,
  explanation: true,
});

export const insertChatHistorySchema = createInsertSchema(chatHistory).pick({
  userId: true,
  sessionId: true,
  messages: true,
  subject: true,
});

export const insertStudyPlanSchema = createInsertSchema(studyPlans).pick({
  userId: true,
  title: true,
  description: true,
  scheduleData: true,
  startDate: true,
  endDate: true,
});

// Extended schema with validation for forms
export const waitlistFormSchema = insertWaitlistSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  consent: z.boolean().refine(val => val === true, {
    message: "You must consent to receive updates"
  })
});

export const userRegistrationSchema = insertUserSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.date().optional().default(() => new Date()),
});

export const documentUploadSchema = insertDocumentSchema.extend({
  title: z.string().min(1, "Title is required"),
  fileType: z.enum(["pdf", "txt", "doc", "docx"]),
});

export const codeGenerationSchema = z.object({
  problem: z.string().min(10, "Please describe your problem in more detail"),
  language: z.enum(["python", "javascript", "java", "c++", "typescript"]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcards.$inferSelect;

export type InsertMcq = z.infer<typeof insertMcqSchema>;
export type Mcq = typeof mcqs.$inferSelect;

export type InsertCodeSnippet = z.infer<typeof insertCodeSnippetSchema>;
export type CodeSnippet = typeof codeSnippets.$inferSelect;

export type InsertChatHistory = z.infer<typeof insertChatHistorySchema>;
export type ChatHistory = typeof chatHistory.$inferSelect;

export type InsertStudyPlan = z.infer<typeof insertStudyPlanSchema>;
export type StudyPlan = typeof studyPlans.$inferSelect;

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type CodeGeneration = z.infer<typeof codeGenerationSchema>;
