import { mysqlTable, text, int, boolean, timestamp, json, varchar, index, primaryKey, unique, foreignKey } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===== STRUCTURED DATA TABLES (MySQL) =====

// User Management
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(), // Using varchar with length for better indexing
  password: text("password").notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(), // Using varchar with length for better indexing
  fullName: varchar("full_name", { length: 100 }),
  profilePicture: text("profile_picture"),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  role: varchar("role", { length: 20 }).default("user").notNull(), // For role-based access control
  lastLogin: timestamp("last_login", { mode: 'date' }), // Track login times for security
  isActive: boolean("is_active").default(true), // For account activation/deactivation
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
});

// Authentication records (keeps track of sessions, login attempts, etc.)
export const authentication = mysqlTable("authentication", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token", { length: 255 }),
  provider: varchar("provider", { length: 20 }).default("local").notNull(), // For OAuth integration (local, google, etc.)
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("auth_user_id_idx").on(table.userId),
    tokenIdx: index("auth_token_idx").on(table.token),
  }
});

// Study Sessions and Notes
export const documents = mysqlTable("documents", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  fileType: varchar("file_type", { length: 20 }),
  summary: text("summary"),
  isPrivate: boolean("is_private").default(true), // For potential document sharing
  status: varchar("status", { length: 20 }).default("active"), // For document status (active, archived, deleted)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("doc_user_id_idx").on(table.userId),
    titleIdx: index("doc_title_idx").on(table.title), // For search by title
    statusIdx: index("doc_status_idx").on(table.status), // For quick filtering by status
  }
});

// Flashcards created from documents
export const flashcards = mysqlTable("flashcards", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: int("document_id").references(() => documents.id, { onDelete: 'set null' }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  tags: json("tags"), // Stored as JSON array in MySQL
  difficulty: varchar("difficulty", { length: 10 }).default("medium"),
  repetitionInterval: int("repetition_interval").default(1), // For spaced repetition
  easeFactor: int("ease_factor").default(250), // For SM-2 algorithm (times 100)
  lastReviewed: timestamp("last_reviewed"),
  nextReviewDate: timestamp("next_review_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("fc_user_id_idx").on(table.userId),
    docIdIdx: index("fc_doc_id_idx").on(table.documentId),
    reviewDateIdx: index("fc_review_date_idx").on(table.nextReviewDate), // For retrieving due cards
  }
});

// MCQs for quizzes
export const mcqs = mysqlTable("mcqs", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: int("document_id").references(() => documents.id, { onDelete: 'set null' }),
  question: text("question").notNull(),
  options: json("options").notNull(), // Stored as JSON array in MySQL
  correctOption: int("correct_option").notNull(),
  explanation: text("explanation"),
  difficulty: varchar("difficulty", { length: 10 }).notNull().default("medium"),
  category: varchar("category", { length: 50 }),
  isPublic: boolean("is_public").default(false), // For sharing questions in a question bank
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("mcq_user_id_idx").on(table.userId),
    docIdIdx: index("mcq_doc_id_idx").on(table.documentId),
    difficultyIdx: index("mcq_difficulty_idx").on(table.difficulty), // For adaptive quizzes
    categoryIdx: index("mcq_category_idx").on(table.category), // For subject-specific quizzes
  }
});

// User's quiz sessions and attempts
export const quizAttempts = mysqlTable("quiz_attempts", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  score: int("score").notNull(),
  totalQuestions: int("total_questions").notNull(),
  correctAnswers: int("correct_answers").notNull(),
  timeSpent: int("time_spent"), // In seconds
  questionsData: json("questions_data"), // Contains question IDs and user answers
  category: varchar("category", { length: 50 }),
  difficulty: varchar("difficulty", { length: 10 }),
  completed: boolean("completed").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("qa_user_id_idx").on(table.userId),
    createdAtIdx: index("qa_created_at_idx").on(table.createdAt), // For time-based analytics
  }
});

// Individual question attempts within a quiz
export const questionAttempts = mysqlTable("question_attempts", {
  id: int().autoincrement().primaryKey(),
  quizAttemptId: int("quiz_attempt_id").notNull().references(() => quizAttempts.id, { onDelete: 'cascade' }),
  questionId: int("question_id").notNull(), // MCQ or other question ID
  userAnswer: int("user_answer"), // User's selected option
  isCorrect: boolean("is_correct").notNull(),
  timeSpent: int("time_spent"), // Time spent on this question in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    quizIdIdx: index("qst_quiz_id_idx").on(table.quizAttemptId),
    questionIdIdx: index("qst_question_id_idx").on(table.questionId),
  }
});

// Study planning
export const studyPlans = mysqlTable("study_plans", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scheduleData: json("schedule_data"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completedPercentage: int("completed_percentage").default(0),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("sp_user_id_idx").on(table.userId),
    statusIdx: index("sp_status_idx").on(table.status),
    dateRangeIdx: index("sp_date_range_idx").on(table.startDate, table.endDate), // Optimize date range queries
  }
});

// Study sessions tracking
export const studySessions = mysqlTable("study_sessions", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  studyPlanId: int("study_plan_id").references(() => studyPlans.id, { onDelete: 'set null' }),
  duration: int("duration").notNull(), // Duration in minutes
  subject: varchar("subject", { length: 100 }),
  notes: text("notes"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("ss_user_id_idx").on(table.userId),
    planIdIdx: index("ss_plan_id_idx").on(table.studyPlanId),
    dateIdx: index("ss_date_idx").on(table.startTime), // For analytics by day/week/month
  }
});

// User badges and achievements
export const achievements = mysqlTable("achievements", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  badge: varchar("badge", { length: 50 }).notNull(),
  description: text("description"),
  level: int("level").default(1), // For leveled achievements
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("ach_user_id_idx").on(table.userId),
    badgeIdx: index("ach_badge_idx").on(table.badge), // For leaderboards by achievement
  }
});

// User statistics and progress tracking
export const userStats = mysqlTable("user_stats", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  totalStudyTime: int("total_study_time").default(0), // In minutes
  quizzesCompleted: int("quizzes_completed").default(0),
  averageScore: int("average_score").default(0), // Score * 100 for precision
  documentsUploaded: int("documents_uploaded").default(0),
  flashcardsCreated: int("flashcards_created").default(0),
  flashcardsReviewed: int("flashcards_reviewed").default(0),
  correctFlashcards: int("correct_flashcards").default(0),
  incorrectFlashcards: int("incorrect_flashcards").default(0),
  codeSnippetsGenerated: int("code_snippets_generated").default(0),
  questionsAsked: int("questions_asked").default(0),
  streakDays: int("streak_days").default(0),
  longestStreak: int("longest_streak").default(0),
  xpPoints: int("xp_points").default(0), // For gamification
  level: int("level").default(1), // User level based on XP
  lastActive: timestamp("last_active").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("us_user_id_idx").on(table.userId),
    levelIdx: index("us_level_idx").on(table.level), // For leaderboards
    streakIdx: index("us_streak_idx").on(table.streakDays), // For streaks leaderboard
  }
});

// ===== AI-GENERATED CONTENT TABLES (Now in MySQL) =====
// Chat history sessions
export const chatHistory = mysqlTable("chat_history", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar("session_id", { length: 100 }).notNull().unique(),
  subject: varchar("subject", { length: 255 }),
  messages: json("messages").notNull(), // Array of chat messages
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("chat_user_id_idx").on(table.userId),
    sessionIdIdx: index("chat_session_id_idx").on(table.sessionId),
    lastUpdatedIdx: index("chat_last_updated_idx").on(table.lastUpdated),
  }
});

// Document summaries
export const summaries = mysqlTable("summaries", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: int("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  originalText: text("original_text").notNull(),
  summary: text("summary").notNull(),
  keyPoints: json("key_points"), // Array of key points
  keywords: json("keywords"), // Array of keywords
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("sum_user_id_idx").on(table.userId),
    documentIdIdx: index("sum_doc_id_idx").on(table.documentId),
  }
});

// Code snippets generated by AI
export const codeSnippets = mysqlTable("code_snippets", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  problem: text("problem").notNull(),
  code: text("code").notNull(),
  language: varchar("language", { length: 50 }).notNull(),
  explanation: text("explanation").notNull(),
  tags: json("tags"), // Array of tags
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("cs_user_id_idx").on(table.userId),
    langIdx: index("cs_language_idx").on(table.language),
    titleIdx: index("cs_title_idx").on(table.title),
  }
});

// Cached AI responses for performance
export const cachedResponses = mysqlTable("cached_responses", {
  id: int().autoincrement().primaryKey(),
  query: varchar("query", { length: 500 }).notNull(),
  response: text("response").notNull(),
  metadata: json("metadata"), // Additional metadata as JSON
  ttl: timestamp("ttl").notNull(), // Time to live - when cache expires
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    queryIdx: index("cr_query_idx").on(table.query),
    ttlIdx: index("cr_ttl_idx").on(table.ttl),
  }
});

// Define insertion schemas
export const insertUserSchema = createInsertSchema(users, {
  username: z.string(),
  password: z.string(),
  email: z.string(),
  fullName: z.string().optional(),
  preferredLanguage: z.string().optional(),
});

// Waitlist insertion schema removed

export const insertDocumentSchema = createInsertSchema(documents, {
  userId: z.number(),
  title: z.string(),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  fileType: z.string().optional(),
});

export const insertFlashcardSchema = createInsertSchema(flashcards, {
  userId: z.number(),
  documentId: z.number(),
  question: z.string(),
  answer: z.string(),
});

export const insertMcqSchema = createInsertSchema(mcqs, {
  userId: z.number(),
  documentId: z.number(),
  question: z.string(),
  correctOption: z.number(),
  explanation: z.string(),
  difficulty: z.string(),
  category: z.string(),
});

export const insertCodeSnippetSchema = createInsertSchema(codeSnippets, {
  userId: z.number(),
  title: z.string(),
  problem: z.string(),
  code: z.string(),
  language: z.string(),
  explanation: z.string(),
});

export const insertChatHistorySchema = createInsertSchema(chatHistory, {
  userId: z.number(),
  sessionId: z.string(),
  subject: z.string().optional(),
  messages: z.any(), // JSON array of messages
});

export const insertSummarySchema = createInsertSchema(summaries, {
  userId: z.number(),
  documentId: z.number(),
  originalText: z.string(),
  summary: z.string(),
});

export const insertCachedResponseSchema = createInsertSchema(cachedResponses, {
  query: z.string(),
  response: z.string(),
  ttl: z.date(),
});

export const insertStudyPlanSchema = createInsertSchema(studyPlans, {
  userId: z.number(),
  title: z.string(),
  description: z.string(),
  scheduleData: z.any(),
  startDate: z.date(),
  endDate: z.date(),
});

// Extended schema with validation for forms - waitlist form removed

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
  context: z.string().optional(),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Waitlist types removed

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

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;

export type InsertCachedResponse = z.infer<typeof insertCachedResponseSchema>;
export type CachedResponse = typeof cachedResponses.$inferSelect;

export type InsertStudyPlan = z.infer<typeof insertStudyPlanSchema>;
export type StudyPlan = typeof studyPlans.$inferSelect;

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type CodeGeneration = z.infer<typeof codeGenerationSchema>;
