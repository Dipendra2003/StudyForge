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
  profilePicture: text("profile_picture"), // Manually set to LONGTEXT in database for base64 images
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  role: varchar("role", { length: 20 }).default("user").notNull(), // For role-based access control
  lastLogin: timestamp("last_login", { mode: 'date' }), // Track login times for security
  isActive: boolean("is_active").default(true), // For account activation/deactivation
  
  // Email verification fields
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationOtp: varchar("verification_otp", { length: 6 }),
  verificationTokenExpiry: timestamp("verification_token_expiry", { mode: 'date' }),
  
  // Password reset fields
  resetToken: text("reset_token"),
  resetOtp: varchar("reset_otp", { length: 6 }),
  resetTokenExpiry: timestamp("reset_token_expiry", { mode: 'date' }),
  
  // Security tracking fields
  failedLoginAttempts: int("failed_login_attempts").default(0),
  lastFailedLogin: timestamp("last_failed_login", { mode: 'date' }),
  accountLockedUntil: timestamp("account_locked_until", { mode: 'date' }),
  
  // Gamification fields
  totalPoints: int("total_points").default(0).notNull(),
  
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
}, (table) => {
  return {
    usernameIdx: index("users_username_idx").on(table.username),
    emailIdx: index("users_email_idx").on(table.email),
    verificationTokenIdx: index("users_verification_token_idx").on(table.verificationToken),
    resetTokenIdx: index("users_reset_token_idx").on(table.resetToken),
  }
});

// Refresh tokens for JWT authentication
export const refreshTokens = mysqlTable("refresh_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { mode: 'date' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  
  // Optional: Track device/IP for security
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
}, (table) => {
  return {
    userIdIdx: index("refresh_tokens_user_id_idx").on(table.userId),
    tokenIdx: index("refresh_tokens_token_idx").on(table.token),
    expiresAtIdx: index("refresh_tokens_expires_at_idx").on(table.expiresAt),
  }
});

// Email logs for tracking email sending attempts
export const emailLogs = mysqlTable("email_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id, { onDelete: 'set null' }),
  emailType: varchar("email_type", { length: 50 }).notNull(), // verification, reset, notification
  recipient: varchar("recipient", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // sent, failed, pending
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { mode: 'date' }).defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("email_logs_user_id_idx").on(table.userId),
    emailTypeIdx: index("email_logs_email_type_idx").on(table.emailType),
    sentAtIdx: index("email_logs_sent_at_idx").on(table.sentAt),
  }
});

// Security audit logs for tracking authentication events
export const securityAuditLogs = mysqlTable("security_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id, { onDelete: 'set null' }),
  action: varchar("action", { length: 50 }).notNull(), // login, logout, register, verify, reset, etc.
  status: varchar("status", { length: 20 }).notNull(), // success, failure
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  details: json("details"), // Additional context
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("security_audit_logs_user_id_idx").on(table.userId),
    actionIdx: index("security_audit_logs_action_idx").on(table.action),
    createdAtIdx: index("security_audit_logs_created_at_idx").on(table.createdAt),
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
  questionImage: text("question_image"), // Image for question side
  answerImage: text("answer_image"), // Image for answer side
  tags: json("tags"), // Stored as JSON array in MySQL
  category: varchar("category", { length: 50 }), // Category for organization
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
    categoryIdx: index("fc_category_idx").on(table.userId, table.category), // For category filtering
  }
});

// Flashcard decks for organizing flashcards
export const flashcardDecks = mysqlTable("flashcard_decks", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("fd_user_id_idx").on(table.userId),
  }
});

// Junction table for many-to-many relationship between decks and flashcards
export const deckFlashcards = mysqlTable("deck_flashcards", {
  deckId: int("deck_id").notNull().references(() => flashcardDecks.id, { onDelete: 'cascade' }),
  flashcardId: int("flashcard_id").notNull().references(() => flashcards.id, { onDelete: 'cascade' }),
  position: int("position").default(0), // For ordering cards within a deck
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.deckId, table.flashcardId] }),
    deckIdIdx: index("df_deck_id_idx").on(table.deckId),
    flashcardIdIdx: index("df_flashcard_id_idx").on(table.flashcardId),
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

// Questions table for AI-Powered Quiz System (supports multiple question types)
export const questions = mysqlTable("questions", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 20 }).notNull(), // mcq, true-false, fill-blank, matching, rearrange
  question: text("question").notNull(),
  questionData: json("question_data").notNull(), // Type-specific data (options, pairs, items, etc.)
  correctAnswer: json("correct_answer").notNull(), // Can be string, array, or object depending on type
  explanation: text("explanation"),
  category: varchar("category", { length: 50 }).notNull(),
  difficulty: varchar("difficulty", { length: 10 }).notNull().default("medium"),
  tags: json("tags"), // Array of tags
  hints: json("hints"), // Array of hints
  isPublic: boolean("is_public").default(false),
  usageCount: int("usage_count").default(0),
  averageScore: int("average_score").default(0), // Score * 100 for precision
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("q_user_id_idx").on(table.userId),
    typeIdx: index("q_type_idx").on(table.type),
    categoryIdx: index("q_category_idx").on(table.category),
    difficultyIdx: index("q_difficulty_idx").on(table.difficulty),
    createdAtIdx: index("q_created_at_idx").on(table.createdAt),
  }
});

// Quiz sessions for tracking active quizzes
export const quizSessions = mysqlTable("quiz_sessions", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar("session_id", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(),
  difficulty: varchar("difficulty", { length: 10 }).notNull(),
  questionTypes: json("question_types").notNull(), // Array of question types
  totalQuestions: int("total_questions").notNull(),
  currentQuestionIndex: int("current_question_index").default(0),
  questionsData: json("questions_data").notNull(), // Array of question IDs and metadata
  answersData: json("answers_data"), // Array of user answers
  timedMode: boolean("timed_mode").default(false),
  timeLimit: int("time_limit"), // In seconds
  timeSpent: int("time_spent").default(0), // In seconds
  voiceModeEnabled: boolean("voice_mode_enabled").default(false),
  hintsUsed: int("hints_used").default(0),
  completed: boolean("completed").default(false),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("qs_user_id_idx").on(table.userId),
    sessionIdIdx: index("qs_session_id_idx").on(table.sessionId),
    categoryIdx: index("qs_category_idx").on(table.category),
    difficultyIdx: index("qs_difficulty_idx").on(table.difficulty),
    createdAtIdx: index("qs_created_at_idx").on(table.createdAt),
  }
});

// User quiz statistics for performance tracking
export const userQuizStats = mysqlTable("user_quiz_stats", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  totalAttempts: int("total_attempts").default(0),
  totalQuestions: int("total_questions").default(0),
  correctAnswers: int("correct_answers").default(0),
  incorrectAnswers: int("incorrect_answers").default(0),
  averageScore: int("average_score").default(0), // Score * 100 for precision
  averageAccuracy: int("average_accuracy").default(0), // Accuracy * 100 for precision
  totalTimeSpent: int("total_time_spent").default(0), // In seconds
  currentStreak: int("current_streak").default(0),
  longestStreak: int("longest_streak").default(0),
  lastQuizDate: timestamp("last_quiz_date"),
  categoryStats: json("category_stats"), // Object with category-specific stats
  difficultyStats: json("difficulty_stats"), // Object with difficulty-specific stats
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("uqs_user_id_idx").on(table.userId),
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
  userAnswer: text("user_answer"), // User's selected answer (can be string, number, or JSON)
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
  earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow().notNull(),
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
  documentId: int("document_id").references(() => documents.id, { onDelete: 'cascade' }), // nullable - summaries can exist without documents
  originalText: text("original_text").notNull(),
  summary: text("summary").notNull(),
  keyPoints: json("key_points"), // Array of key points
  keywords: json("keywords"), // Array of keywords
  metadata: json("metadata"), // Additional metadata (readingTime, difficultyLevel, compression, etc.)
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

// Message feedback (likes, dislikes, etc.)
export const feedback = mysqlTable("feedback", {
  id: int().autoincrement().primaryKey(),
  messageId: int("message_id").notNull(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 20 }).notNull(), // like, dislike, regenerate
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("fb_user_id_idx").on(table.userId),
    messageIdIdx: index("fb_message_id_idx").on(table.messageId),
    typeIdx: index("fb_type_idx").on(table.type),
  }
});

// Shareable quiz links for challenging friends
export const shareableQuizLinks = mysqlTable("shareable_quiz_links", {
  id: int().autoincrement().primaryKey(),
  linkId: varchar("link_id", { length: 100 }).notNull().unique(),
  creatorUserId: int("creator_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizAttemptId: int("quiz_attempt_id").notNull().references(() => quizAttempts.id, { onDelete: 'cascade' }),
  category: varchar("category", { length: 50 }).notNull(),
  difficulty: varchar("difficulty", { length: 10 }).notNull(),
  questionsData: json("questions_data").notNull(), // Array of question IDs
  totalQuestions: int("total_questions").notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  viewCount: int("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    linkIdIdx: index("sql_link_id_idx").on(table.linkId),
    creatorIdx: index("sql_creator_idx").on(table.creatorUserId),
    expiresAtIdx: index("sql_expires_at_idx").on(table.expiresAt),
  }
});

// Shared quiz attempts to track who took shared quizzes
export const sharedQuizAttempts = mysqlTable("shared_quiz_attempts", {
  id: int().autoincrement().primaryKey(),
  shareableLinkId: int("shareable_link_id").notNull(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizAttemptId: int("quiz_attempt_id").notNull().references(() => quizAttempts.id, { onDelete: 'cascade' }),
  score: int("score").notNull(),
  totalQuestions: int("total_questions").notNull(),
  correctAnswers: int("correct_answers").notNull(),
  timeSpent: int("time_spent").notNull(),
  accuracy: int("accuracy").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => {
  return {
    linkIdx: index("sqa_link_idx").on(table.shareableLinkId),
    userIdx: index("sqa_user_idx").on(table.userId),
    uniqueUserLink: unique("unique_user_link").on(table.shareableLinkId, table.userId),
    shareableLinkFk: foreignKey({
      columns: [table.shareableLinkId],
      foreignColumns: [shareableQuizLinks.id],
      name: "sqa_link_fk"
    }).onDelete("cascade"),
  }
});

// Saved quizzes for "Save for Later" functionality
export const savedQuizzes = mysqlTable("saved_quizzes", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: varchar("category", { length: 50 }).notNull(),
  difficulty: varchar("difficulty", { length: 10 }).notNull(),
  questionTypes: json("question_types").notNull(), // Array of question types
  questionCount: int("question_count").notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("sq_user_id_idx").on(table.userId),
    categoryIdx: index("sq_category_idx").on(table.category),
    savedAtIdx: index("sq_saved_at_idx").on(table.savedAt),
  }
});

// Favorite quizzes for marking quizzes as favorites
export const favoriteQuizzes = mysqlTable("favorite_quizzes", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: varchar("category", { length: 50 }).notNull(),
  difficulty: varchar("difficulty", { length: 10 }).notNull(),
  questionTypes: json("question_types").notNull(), // Array of question types
  questionCount: int("question_count").notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  favoritedAt: timestamp("favorited_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("fq_user_id_idx").on(table.userId),
    categoryIdx: index("fq_category_idx").on(table.category),
    favoritedAtIdx: index("fq_favorited_at_idx").on(table.favoritedAt),
    uniqueUserQuiz: unique("unique_user_quiz").on(table.userId, table.category, table.difficulty),
  }
});

// User points tracking for gamification
export const userPoints = mysqlTable("user_points", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  points: int("points").notNull(),
  source: varchar("source", { length: 50 }).notNull(), // 'qotd', 'quiz', 'achievement', 'streak'
  amount: int("amount").notNull(),
  description: text("description"),
  metadata: json("metadata"), // Additional context (quizId, achievementId, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("up_user_id_idx").on(table.userId),
    sourceIdx: index("up_source_idx").on(table.source),
    createdAtIdx: index("up_created_at_idx").on(table.createdAt),
  }
});

// Quiz of the Day completions tracking
export const quizOfTheDayCompletions = mysqlTable("quiz_of_the_day_completions", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizId: varchar("quiz_id", { length: 50 }).notNull(), // 'qotd-2026-03-14'
  date: timestamp("date").notNull(), // Date of the quiz
  category: varchar("category", { length: 50 }).notNull(),
  difficulty: varchar("difficulty", { length: 10 }).notNull(),
  score: int("score").notNull(),
  totalQuestions: int("total_questions").notNull(),
  correctAnswers: int("correct_answers").notNull(),
  timeSpent: int("time_spent").notNull(), // seconds
  accuracy: int("accuracy").notNull(), // percentage
  bonusAwarded: int("bonus_awarded").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("qotd_user_id_idx").on(table.userId),
    dateIdx: index("qotd_date_idx").on(table.date),
    quizIdIdx: index("qotd_quiz_id_idx").on(table.quizId),
    userDateIdx: unique("qotd_user_date_unique").on(table.userId, table.date),
  }
});

// Contact messages for user inquiries
export const contactMessages = mysqlTable("contact_messages", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id, { onDelete: 'set null' }), // Optional - can be null for non-logged-in users
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, read, responded, closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("contact_user_id_idx").on(table.userId),
    statusIdx: index("contact_status_idx").on(table.status),
    createdAtIdx: index("contact_created_at_idx").on(table.createdAt),
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

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens, {
  userId: z.number(),
  token: z.string(),
  expiresAt: z.date(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs, {
  userId: z.number().optional(),
  emailType: z.string(),
  recipient: z.string(),
  subject: z.string(),
  status: z.enum(["sent", "failed", "pending"]),
  errorMessage: z.string().optional(),
});

export const insertSecurityAuditLogSchema = createInsertSchema(securityAuditLogs, {
  userId: z.number().optional(),
  action: z.string(),
  status: z.enum(["success", "failure"]),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  details: z.any().optional(),
});

// Waitlist insertion schema removed

export const insertDocumentSchema = createInsertSchema(documents, {
  userId: z.number(),
  title: z.string(),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  fileType: z.string().optional(),
});

export const insertFlashcardSchema = z.object({
  documentId: z.number().optional(),
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  questionImage: z.string().optional(),
  answerImage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().max(50).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  repetitionInterval: z.number().optional(),
  easeFactor: z.number().optional(),
  lastReviewed: z.date().optional(),
  nextReviewDate: z.date().optional(),
});

export const insertFlashcardDeckSchema = createInsertSchema(flashcardDecks, {
  userId: z.number(),
  name: z.string().min(1, "Deck name is required").max(255),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const insertDeckFlashcardSchema = createInsertSchema(deckFlashcards, {
  deckId: z.number(),
  flashcardId: z.number(),
  position: z.number().optional(),
});

export const insertMcqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  options: z.array(z.string()).min(2, "At least 2 options are required"),
  correctOption: z.number().min(0, "Correct option must be a valid index"),
  explanation: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  category: z.string().optional(),
  documentId: z.number().optional(),
});

export const insertQuestionSchema = createInsertSchema(questions, {
  userId: z.number(),
  type: z.enum(["mcq", "true-false", "fill-blank", "matching", "rearrange"]),
  question: z.string().min(1, "Question is required"),
  questionData: z.any(), // JSON data specific to question type
  correctAnswer: z.any(), // Can be string, array, or object
  explanation: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string()).optional(),
  hints: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

export const insertQuizSessionSchema = createInsertSchema(quizSessions, {
  userId: z.number(),
  sessionId: z.string(),
  category: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionTypes: z.array(z.enum(["mcq", "true-false", "fill-blank", "matching", "rearrange"])),
  totalQuestions: z.number().min(1),
  questionsData: z.any(), // Array of question data
  timedMode: z.boolean().optional(),
  timeLimit: z.number().optional(),
  voiceModeEnabled: z.boolean().optional(),
});

export const insertUserQuizStatsSchema = createInsertSchema(userQuizStats, {
  userId: z.number(),
  totalAttempts: z.number().optional(),
  totalQuestions: z.number().optional(),
  correctAnswers: z.number().optional(),
  incorrectAnswers: z.number().optional(),
  averageScore: z.number().optional(),
  averageAccuracy: z.number().optional(),
  totalTimeSpent: z.number().optional(),
  currentStreak: z.number().optional(),
  longestStreak: z.number().optional(),
  lastQuizDate: z.date().optional(),
  categoryStats: z.any().optional(),
  difficultyStats: z.any().optional(),
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
  documentId: z.number().optional(),
  originalText: z.string(),
  summary: z.string(),
});

export const insertCachedResponseSchema = createInsertSchema(cachedResponses, {
  query: z.string(),
  response: z.string(),
  ttl: z.date(),
});

export const insertFeedbackSchema = createInsertSchema(feedback, {
  messageId: z.number(),
  userId: z.number(),
  type: z.enum(["like", "dislike", "unlike", "undislike", "regenerate", "report"]),
});

export const insertStudyPlanSchema = createInsertSchema(studyPlans, {
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  scheduleData: z.any().optional().nullable(),
  startDate: z.string().or(z.date()).optional().nullable().transform(val => {
    if (!val) return null;
    return typeof val === 'string' ? new Date(val) : val;
  }),
  endDate: z.string().or(z.date()).optional().nullable().transform(val => {
    if (!val) return null;
    return typeof val === 'string' ? new Date(val) : val;
  }),
}).omit({ userId: true, id: true, createdAt: true, updatedAt: true, completedPercentage: true, status: true });

export const insertContactMessageSchema = createInsertSchema(contactMessages, {
  userId: z.number().optional(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(100),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  status: z.enum(["pending", "read", "responded", "closed"]).optional(),
});

// User registration schema removed - authentication disabled

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.date().optional().default(() => new Date()),
});

export const documentUploadSchema = insertDocumentSchema.omit({ userId: true }).extend({
  title: z.string().min(1, "Title is required"),
  fileType: z.enum(["pdf", "txt", "doc", "docx"]).optional(),
});

export const codeGenerationSchema = z.object({
  problem: z.string().min(10, "Please describe your problem in more detail"),
  language: z.enum([
    "python", 
    "javascript", 
    "java", 
    "c++", 
    "typescript",
    "go",
    "rust",
    "ruby",
    "php",
    "swift",
    "kotlin",
    "c#",
    "r",
    "sql"
  ]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  context: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
});

// ===== AUTHENTICATION REQUEST/RESPONSE SCHEMAS =====

// Registration schema
export const registerSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "Username must start with a letter and contain only letters, numbers, underscores, and hyphens"),
  email: z.string()
    .email("Invalid email format")
    .max(100, "Email must not exceed 100 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  fullName: z.string()
    .min(1, "Full name is required")
    .max(100, "Full name must not exceed 100 characters"),
});

// Login schema
export const loginSchema = z.object({
  identifier: z.string()
    .min(1, "Username or email is required"),
  password: z.string()
    .min(1, "Password is required"),
});

// Email verification schema
export const verifyEmailSchema = z.object({
  token: z.string().optional(),
  otp: z.string().length(6, "OTP must be 6 digits").optional(),
}).refine(data => data.token || data.otp, {
  message: "Either token or OTP is required",
});

// Resend verification schema
export const resendVerificationSchema = z.object({
  email: z.string()
    .email("Invalid email format"),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email("Invalid email format"),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().optional(),
  otp: z.string().length(6, "OTP must be 6 digits").optional(),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
}).refine(data => data.token || data.otp, {
  message: "Either token or OTP is required",
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(), // Can come from cookie or body
});

// API Response schema
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  message: z.string(),
  data: dataSchema.optional(),
  errors: z.array(z.string()).optional(),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

export type InsertSecurityAuditLog = z.infer<typeof insertSecurityAuditLogSchema>;
export type SecurityAuditLog = typeof securityAuditLogs.$inferSelect;

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// Waitlist types removed

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcards.$inferSelect;

export type InsertFlashcardDeck = z.infer<typeof insertFlashcardDeckSchema>;
export type FlashcardDeck = typeof flashcardDecks.$inferSelect;

export type InsertDeckFlashcard = z.infer<typeof insertDeckFlashcardSchema>;
export type DeckFlashcard = typeof deckFlashcards.$inferSelect;

// Extended types for deck with cards
export type DeckWithCards = FlashcardDeck & {
  cards: Flashcard[];
  cardCount: number;
};

// Analytics interface for flashcard statistics
export interface FlashcardAnalytics {
  reviewHistory: { date: string; count: number }[];
  accuracyByCategory: { category: string; accuracy: number; total: number }[];
  masteryLevels: { level: string; count: number }[];
  studyStreak: { current: number; longest: number };
  totalReviews: number;
  averageAccuracy: number;
}

export type InsertMcq = z.infer<typeof insertMcqSchema>;
export type Mcq = typeof mcqs.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;
export type QuizSession = typeof quizSessions.$inferSelect;

export type InsertUserQuizStats = z.infer<typeof insertUserQuizStatsSchema>;
export type UserQuizStats = typeof userQuizStats.$inferSelect;

export type InsertCodeSnippet = z.infer<typeof insertCodeSnippetSchema>;
export type CodeSnippet = typeof codeSnippets.$inferSelect;

export type InsertChatHistory = z.infer<typeof insertChatHistorySchema>;
export type ChatHistory = typeof chatHistory.$inferSelect;

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;

export type InsertCachedResponse = z.infer<typeof insertCachedResponseSchema>;
export type CachedResponse = typeof cachedResponses.$inferSelect;

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export type InsertStudyPlan = z.infer<typeof insertStudyPlanSchema>;
export type StudyPlan = typeof studyPlans.$inferSelect;

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type CodeGeneration = z.infer<typeof codeGenerationSchema>;

// Authentication types
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationRequest = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;

// Saved quiz schema
export const insertSavedQuizSchema = createInsertSchema(savedQuizzes, {
  userId: z.number(),
  category: z.string().min(1, "Category is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionTypes: z.array(z.enum(["mcq", "true-false", "fill-blank", "matching", "rearrange"])),
  questionCount: z.number().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
});

// Favorite quiz schema
export const insertFavoriteQuizSchema = createInsertSchema(favoriteQuizzes, {
  userId: z.number(),
  category: z.string().min(1, "Category is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionTypes: z.array(z.enum(["mcq", "true-false", "fill-blank", "matching", "rearrange"])),
  questionCount: z.number().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
});
