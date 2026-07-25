import {
  users,
  type User,
  type InsertUser,
  documents,
  type Document,
  type InsertDocument,
  flashcards,
  type Flashcard,
  type InsertFlashcard,
  mcqs,
  type Mcq,
  type InsertMcq,
  type InsertCodeSnippet,
  type CodeSnippet,
  codeSnippets,
  chatHistory,
  type ChatHistory,
  type InsertChatHistory,
  studyPlans,
  type StudyPlan,
  type InsertStudyPlan,
  userStats,
  summaries,
  type Summary,
  type InsertSummary,
  type ChatMessage,
  refreshTokens,
  type RefreshToken,
  type InsertRefreshToken,
  emailLogs,
  type EmailLog,
  type InsertEmailLog,
  securityAuditLogs,
  type SecurityAuditLog,
  type InsertSecurityAuditLog,
  savedQuizzes,
  favoriteQuizzes,
} from "@shared/schema";
import { db } from "./db/index";
import { eq, and, desc, count } from "drizzle-orm";

/**
 * Helper function to safely convert insertId to number
 * Drizzle's $returningId() returns { id: number | bigint }
 * This ensures we always get a number for consistency
 */
function toNumberId(id: number | bigint): number {
  return typeof id === 'bigint' ? Number(id) : id;
}

// Interface for all storage CRUD operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByVerificationOtp(otp: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUserByResetOtp(otp: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Document methods
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentById(id: number): Promise<Document | undefined>;
  getDocumentsByUserId(userId: number, page?: number, limit?: number): Promise<{ documents: Document[], total: number, page: number, totalPages: number }>;
  updateDocument(
    id: number,
    document: Partial<Document>,
  ): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  // Flashcard methods
  createFlashcard(flashcard: InsertFlashcard & { userId: number }): Promise<Flashcard>;
  getFlashcardById(id: number): Promise<Flashcard | undefined>;
  getFlashcardsByUserId(userId: number, page?: number, limit?: number): Promise<{ flashcards: Flashcard[], total: number, page: number, totalPages: number }>;
  getFlashcardsByDocumentId(documentId: number): Promise<Flashcard[]>;
  updateFlashcard(
    id: number,
    flashcard: Partial<Flashcard>,
  ): Promise<Flashcard | undefined>;
  deleteFlashcard(id: number): Promise<boolean>;

  // MCQ methods
  createMcq(mcq: InsertMcq & { userId: number }): Promise<Mcq>;
  getMcqById(id: number): Promise<Mcq | undefined>;
  getMcqsByUserId(userId: number, page?: number, limit?: number): Promise<{ mcqs: Mcq[], total: number, page: number, totalPages: number }>;
  getMcqsByDocumentId(documentId: number): Promise<Mcq[]>;
  getMcqsByDifficulty(userId: number, difficulty: string): Promise<Mcq[]>;
  updateMcq(id: number, mcq: Partial<Mcq>): Promise<Mcq | undefined>;
  deleteMcq(id: number): Promise<boolean>;

  // Code snippet methods
  createCodeSnippet(snippet: InsertCodeSnippet): Promise<CodeSnippet>;
  getCodeSnippetById(id: number): Promise<CodeSnippet | undefined>;
  getCodeSnippetsByUserId(userId: number, page?: number, limit?: number): Promise<{ snippets: CodeSnippet[], total: number, page: number, totalPages: number }>;
  updateCodeSnippet(
    id: number,
    snippet: Partial<CodeSnippet>,
  ): Promise<CodeSnippet | undefined>;
  deleteCodeSnippet(id: number): Promise<boolean>;

  // Chat history methods
  createChatHistory(history: InsertChatHistory): Promise<ChatHistory>;
  getChatHistoryById(id: number): Promise<ChatHistory | undefined>;
  getChatHistoriesByUserId(userId: number): Promise<ChatHistory[]>;
  updateChatHistory(
    id: number,
    message: ChatMessage,
  ): Promise<ChatHistory | undefined>;
  updateChatHistorySubject(id: number, subject: string): Promise<ChatHistory | undefined>;
  deleteChatHistory(id: number): Promise<void>;

  // Study plan methods
  createStudyPlan(plan: InsertStudyPlan): Promise<StudyPlan>;
  getStudyPlanById(id: number): Promise<StudyPlan | undefined>;
  getStudyPlansByUserId(userId: number): Promise<StudyPlan[]>;
  updateStudyPlan(
    id: number,
    plan: Partial<StudyPlan>,
  ): Promise<StudyPlan | undefined>;
  deleteStudyPlan(id: number): Promise<boolean>;

  // User statistics methods
  getUserStats(userId: number): Promise<any | undefined>;
  updateUserStats(
    userId: number,
    stats: Partial<any>,
  ): Promise<any | undefined>;

  // Summary methods
  createSummary(summary: any): Promise<any>;
  getSummaryById(id: number): Promise<any | undefined>;
  getSummariesByUserId(userId: number): Promise<any[]>;
  getSummariesByDocumentId(documentId: number): Promise<any[]>;
  updateSummary(id: number, summary: Partial<any>): Promise<any | undefined>;
  deleteSummary(id: number): Promise<boolean>;

  // Quiz attempts methods
  createQuizAttempt(attempt: any): Promise<any>;
  getQuizAttemptsByUserId(userId: number, limit?: number): Promise<any[]>;
  getQuizStatsByUserId(userId: number): Promise<any>;

  // Feedback methods
  createFeedback(feedback: any): Promise<any>;
  getFeedbackByMessageId(messageId: number, userId: number): Promise<any | undefined>;

  // Deck methods
  createDeck(deck: any): Promise<any>;
  getDeckById(id: number): Promise<any | undefined>;
  getDecksByUserId(userId: number): Promise<any[]>;
  updateDeck(id: number, deck: Partial<any>): Promise<any | undefined>;
  deleteDeck(id: number): Promise<boolean>;
  getFlashcardsByDeckId(deckId: number): Promise<Flashcard[]>;
  getDeckIdsForFlashcard(flashcardId: number): Promise<number[]>;
  addCardToDeck(deckId: number, flashcardId: number, position?: number): Promise<any>;
  removeCardFromDeck(deckId: number, flashcardId: number): Promise<boolean>;

  // Refresh token methods
  createRefreshToken(refreshToken: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<boolean>;
  deleteAllUserRefreshTokens(userId: number): Promise<boolean>;

  // Email log methods
  createEmailLog(emailLog: InsertEmailLog): Promise<EmailLog>;
  getRecentEmailLogs(userId: number, emailType: string, minutesAgo: number): Promise<EmailLog[]>;

  // Security audit log methods
  createSecurityAuditLog(auditLog: InsertSecurityAuditLog): Promise<SecurityAuditLog>;
  getSecurityAuditLogsByUser(userId: number, limit?: number): Promise<SecurityAuditLog[]>;

  // Saved quiz methods
  saveQuiz(userId: number, quizData: any): Promise<any>;
  getSavedQuizzes(userId: number): Promise<any[]>;
  removeSavedQuiz(userId: number, quizId: number): Promise<boolean>;

  // Favorite quiz methods
  favoriteQuiz(userId: number, quizData: any): Promise<any>;
  getFavoriteQuizzes(userId: number): Promise<any[]>;
  removeFavoriteQuiz(userId: number, quizId: number): Promise<boolean>;
  isFavoriteQuiz(userId: number, category: string, difficulty: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  // Saved quiz methods (stub implementations for MemStorage)
  async saveQuiz(userId: number, quizData: any): Promise<any> {
    throw new Error("MemStorage does not support saved quizzes");
  }

  async getSavedQuizzes(userId: number): Promise<any[]> {
    return [];
  }

  async removeSavedQuiz(userId: number, quizId: number): Promise<boolean> {
    return false;
  }

  // Favorite quiz methods (stub implementations for MemStorage)
  async favoriteQuiz(userId: number, quizData: any): Promise<any> {
    throw new Error("MemStorage does not support favorite quizzes");
  }

  async getFavoriteQuizzes(userId: number): Promise<any[]> {
    return [];
  }

  async removeFavoriteQuiz(userId: number, quizId: number): Promise<boolean> {
    return false;
  }

  async isFavoriteQuiz(userId: number, category: string, difficulty: string): Promise<boolean> {
    return false;
  }
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private flashcards: Map<number, Flashcard>;
  private mcqs: Map<number, Mcq>;
  private codeSnippets: Map<number, CodeSnippet>;
  private chatHistories: Map<number, ChatHistory>;
  private studyPlans: Map<number, StudyPlan>;
  // private achievements: Map<number, any>; // Unused - reserved for future use
  private userStatsMap: Map<number, any>;
  private decks: Map<number, any>;
  private deckFlashcards: Map<string, any>;
  private refreshTokensMap: Map<number, RefreshToken>;
  private emailLogsMap: Map<number, EmailLog>;
  private securityAuditLogsMap: Map<number, SecurityAuditLog>;

  // Track IDs
  currentUserId: number;
  currentDocumentId: number;
  currentFlashcardId: number;
  currentMcqId: number;
  currentCodeSnippetId: number;
  currentChatHistoryId: number;
  currentStudyPlanId: number;
  currentAchievementId: number;
  currentUserStatsId: number;
  currentDeckId: number;
  currentRefreshTokenId: number;
  currentEmailLogId: number;
  currentSecurityAuditLogId: number;

  constructor() {
    // Initialize maps
    this.users = new Map();
    this.documents = new Map();
    this.flashcards = new Map();
    this.mcqs = new Map();
    this.codeSnippets = new Map();
    this.chatHistories = new Map();
    this.studyPlans = new Map();
    // this.achievements = new Map(); // Unused - reserved for future use
    this.userStatsMap = new Map();
    this.decks = new Map();
    this.deckFlashcards = new Map();
    this.refreshTokensMap = new Map();
    this.emailLogsMap = new Map();
    this.securityAuditLogsMap = new Map();

    // Initialize IDs
    this.currentUserId = 1;
    this.currentDocumentId = 1;
    this.currentFlashcardId = 1;
    this.currentMcqId = 1;
    this.currentCodeSnippetId = 1;
    this.currentChatHistoryId = 1;
    this.currentStudyPlanId = 1;
    this.currentAchievementId = 1;
    this.currentUserStatsId = 1;
    this.currentDeckId = 1;
    this.currentRefreshTokenId = 1;
    this.currentEmailLogId = 1;
    this.currentSecurityAuditLogId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.verificationToken === token,
    );
  }

  async getUserByVerificationOtp(otp: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.verificationOtp === otp,
    );
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.resetToken === token,
    );
  }

  async getUserByResetOtp(otp: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.resetOtp === otp,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      fullName: insertUser.fullName || null,
      profilePicture: insertUser.profilePicture || null,
      preferredLanguage: insertUser.preferredLanguage || null,
      role: insertUser.role || "user",
      lastLogin: null,
      isActive: true,
      emailVerified: (insertUser as any).emailVerified ?? false,
      verificationToken: (insertUser as any).verificationToken || null,
      verificationOtp: (insertUser as any).verificationOtp || null,
      verificationTokenExpiry: (insertUser as any).verificationTokenExpiry || null,
      resetToken: (insertUser as any).resetToken || null,
      resetOtp: (insertUser as any).resetOtp || null,
      resetTokenExpiry: (insertUser as any).resetTokenExpiry || null,
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      accountLockedUntil: null,
      totalPoints: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(
    id: number,
    userData: Partial<User>,
  ): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      ...userData,
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Document methods
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const now = new Date();
    const document: Document = {
      id,
      userId: insertDocument.userId,
      title: insertDocument.title,
      content: insertDocument.content || null,
      fileUrl: insertDocument.fileUrl || null,
      fileType: insertDocument.fileType || null,
      summary: null,
      isPrivate: insertDocument.isPrivate ?? true,
      status: insertDocument.status || "active",
      createdAt: now,
      updatedAt: now,
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByUserId(userId: number, page?: number, limit?: number): Promise<{ documents: Document[], total: number, page: number, totalPages: number }> {
    const allDocs = Array.from(this.documents.values()).filter(
      (doc) => doc.userId === userId,
    );
    
    // If no pagination params, return all
    if (!page || !limit) {
      return {
        documents: allDocs,
        total: allDocs.length,
        page: 1,
        totalPages: 1,
      };
    }
    
    const total = allDocs.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const documents = allDocs.slice(offset, offset + limit);
    
    return { documents, total, page, totalPages };
  }

  async updateDocument(
    id: number,
    documentData: Partial<Document>,
  ): Promise<Document | undefined> {
    const document = await this.getDocumentById(id);
    if (!document) return undefined;

    const updatedDocument = {
      ...document,
      ...documentData,
      updatedAt: new Date(),
    };

    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Flashcard methods
  async createFlashcard(insertFlashcard: InsertFlashcard & { userId: number }): Promise<Flashcard> {
    const id = this.currentFlashcardId++;
    const now = new Date();
    const flashcard: Flashcard = {
      id,
      userId: insertFlashcard.userId,
      documentId: insertFlashcard.documentId || null,
      question: insertFlashcard.question,
      answer: insertFlashcard.answer,
      questionImage: insertFlashcard.questionImage || null,
      answerImage: insertFlashcard.answerImage || null,
      tags: insertFlashcard.tags || null,
      category: insertFlashcard.category || null,
      difficulty: insertFlashcard.difficulty || "medium",
      repetitionInterval: insertFlashcard.repetitionInterval || 1,
      easeFactor: insertFlashcard.easeFactor || 250,
      lastReviewed: null,
      nextReviewDate: null,
      createdAt: now,
    };
    this.flashcards.set(id, flashcard);
    return flashcard;
  }

  async getFlashcardById(id: number): Promise<Flashcard | undefined> {
    return this.flashcards.get(id);
  }

  async getFlashcardsByUserId(userId: number, page?: number, limit?: number): Promise<{ flashcards: Flashcard[], total: number, page: number, totalPages: number }> {
    const allCards = Array.from(this.flashcards.values()).filter(
      (card) => card.userId === userId,
    );
    
    // If no pagination params, return all
    if (!page || !limit) {
      return {
        flashcards: allCards,
        total: allCards.length,
        page: 1,
        totalPages: 1,
      };
    }
    
    const total = allCards.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const flashcards = allCards.slice(offset, offset + limit);
    
    return { flashcards, total, page, totalPages };
  }

  async getFlashcardsByDocumentId(documentId: number): Promise<Flashcard[]> {
    return Array.from(this.flashcards.values()).filter(
      (card) => card.documentId === documentId,
    );
  }

  async updateFlashcard(
    id: number,
    flashcardData: Partial<Flashcard>,
  ): Promise<Flashcard | undefined> {
    const flashcard = await this.getFlashcardById(id);
    if (!flashcard) return undefined;

    const updatedFlashcard = {
      ...flashcard,
      ...flashcardData,
    };

    this.flashcards.set(id, updatedFlashcard);
    return updatedFlashcard;
  }

  async deleteFlashcard(id: number): Promise<boolean> {
    return this.flashcards.delete(id);
  }

  // MCQ methods
  async createMcq(insertMcq: InsertMcq & { userId: number }): Promise<Mcq> {
    const id = this.currentMcqId++;
    const now = new Date();
    const mcq: Mcq = {
      id,
      userId: insertMcq.userId,
      documentId: insertMcq.documentId || null,
      question: insertMcq.question,
      options: insertMcq.options,
      correctOption:
        typeof insertMcq.correctOption === "string"
          ? parseInt(insertMcq.correctOption)
          : insertMcq.correctOption,
      explanation: insertMcq.explanation || null,
      difficulty: insertMcq.difficulty || "medium",
      category: insertMcq.category || null,
      isPublic: false,
      createdAt: now,
    };
    this.mcqs.set(id, mcq);
    return mcq;
  }

  async getMcqById(id: number): Promise<Mcq | undefined> {
    return this.mcqs.get(id);
  }

  async getMcqsByUserId(userId: number, page?: number, limit?: number): Promise<{ mcqs: Mcq[], total: number, page: number, totalPages: number }> {
    const allMcqs = Array.from(this.mcqs.values()).filter(
      (mcq) => mcq.userId === userId,
    );
    
    // If no pagination params, return all
    if (!page || !limit) {
      return {
        mcqs: allMcqs,
        total: allMcqs.length,
        page: 1,
        totalPages: 1,
      };
    }
    
    const total = allMcqs.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const mcqs = allMcqs.slice(offset, offset + limit);
    
    return { mcqs, total, page, totalPages };
  }

  async getMcqsByDocumentId(documentId: number): Promise<Mcq[]> {
    return Array.from(this.mcqs.values()).filter(
      (mcq) => mcq.documentId === documentId,
    );
  }

  async getMcqsByDifficulty(
    userId: number,
    difficulty: string,
  ): Promise<Mcq[]> {
    return Array.from(this.mcqs.values()).filter(
      (mcq) => mcq.userId === userId && mcq.difficulty === difficulty,
    );
  }

  async updateMcq(id: number, mcqData: Partial<Mcq>): Promise<Mcq | undefined> {
    const mcq = await this.getMcqById(id);
    if (!mcq) return undefined;

    const updatedMcq = {
      ...mcq,
      ...mcqData,
    };

    this.mcqs.set(id, updatedMcq);
    return updatedMcq;
  }

  async deleteMcq(id: number): Promise<boolean> {
    return this.mcqs.delete(id);
  }

  // Code snippet methods
  async createCodeSnippet(
    insertSnippet: InsertCodeSnippet,
  ): Promise<CodeSnippet> {
    const id = this.currentCodeSnippetId++;
    const now = new Date();
    const snippet: CodeSnippet = {
      id,
      userId: insertSnippet.userId,
      title: insertSnippet.title,
      problem: insertSnippet.problem,
      code: insertSnippet.code,
      language: insertSnippet.language,
      explanation: insertSnippet.explanation,
      tags: insertSnippet.tags || null,
      createdAt: now,
      updatedAt: now,
    };
    this.codeSnippets.set(id, snippet);
    return snippet;
  }

  async getCodeSnippetById(id: number): Promise<CodeSnippet | undefined> {
    return this.codeSnippets.get(id);
  }

  async getCodeSnippetsByUserId(userId: number, page?: number, limit?: number): Promise<{ snippets: CodeSnippet[], total: number, page: number, totalPages: number }> {
    const allSnippets = Array.from(this.codeSnippets.values()).filter(
      (snippet) => snippet.userId === userId,
    );
    
    // If no pagination params, return all
    if (!page || !limit) {
      return {
        snippets: allSnippets,
        total: allSnippets.length,
        page: 1,
        totalPages: 1,
      };
    }
    
    const total = allSnippets.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const snippets = allSnippets.slice(offset, offset + limit);
    
    return { snippets, total, page, totalPages };
  }

  async updateCodeSnippet(
    id: number,
    snippetData: Partial<CodeSnippet>,
  ): Promise<CodeSnippet | undefined> {
    const snippet = await this.getCodeSnippetById(id);
    if (!snippet) return undefined;

    const updatedSnippet = {
      ...snippet,
      ...snippetData,
    };

    this.codeSnippets.set(id, updatedSnippet);
    return updatedSnippet;
  }

  async deleteCodeSnippet(id: number): Promise<boolean> {
    return this.codeSnippets.delete(id);
  }

  // Chat history methods
  async createChatHistory(
    insertHistory: InsertChatHistory,
  ): Promise<ChatHistory> {
    const id = this.currentChatHistoryId++;
    const now = new Date();
    const history: ChatHistory = {
      id,
      userId: insertHistory.userId,
      sessionId: insertHistory.sessionId,
      subject: insertHistory.subject || null,
      messages: insertHistory.messages || [],
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
    };
    this.chatHistories.set(id, history);
    return history;
  }

  async getChatHistoryById(id: number): Promise<ChatHistory | undefined> {
    return this.chatHistories.get(id);
  }

  async getChatHistoriesByUserId(userId: number): Promise<ChatHistory[]> {
    return Array.from(this.chatHistories.values()).filter(
      (history) => history.userId === userId,
    );
  }

  async updateChatHistory(
    id: number,
    message: ChatMessage,
  ): Promise<ChatHistory | undefined> {
    const history = await this.getChatHistoryById(id);
    if (!history) return undefined;

    const messages = Array.isArray(history.messages)
      ? [...history.messages, message]
      : [message];
    const now = new Date();

    const updatedHistory = {
      ...history,
      messages,
      lastUpdated: now,
      updatedAt: now,
    };

    this.chatHistories.set(id, updatedHistory);
    return updatedHistory;
  }

  async updateChatHistorySubject(id: number, subject: string): Promise<ChatHistory | undefined> {
    const history = await this.getChatHistoryById(id);
    if (!history) return undefined;

    const updatedHistory = {
      ...history,
      subject,
      updatedAt: new Date(),
    };

    this.chatHistories.set(id, updatedHistory);
    return updatedHistory;
  }

  async deleteChatHistory(id: number): Promise<void> {
    this.chatHistories.delete(id);
  }

  // Study plan methods
  async createStudyPlan(insertPlan: InsertStudyPlan): Promise<StudyPlan> {
    const id = this.currentStudyPlanId++;
    const now = new Date();
    const plan: StudyPlan = {
      id,
      userId: 0, // MemStorage doesn't track userId properly
      title: insertPlan.title,
      description: insertPlan.description || null,
      scheduleData: insertPlan.scheduleData,
      startDate: insertPlan.startDate || null,
      endDate: insertPlan.endDate || null,
      completedPercentage: 0,
      status: "active", // Default status
      createdAt: now,
      updatedAt: now,
    };
    this.studyPlans.set(id, plan);
    return plan;
  }

  async getStudyPlanById(id: number): Promise<StudyPlan | undefined> {
    return this.studyPlans.get(id);
  }

  async getStudyPlansByUserId(userId: number): Promise<StudyPlan[]> {
    return Array.from(this.studyPlans.values()).filter(
      (plan) => plan.userId === userId,
    );
  }

  async updateStudyPlan(
    id: number,
    planData: Partial<StudyPlan>,
  ): Promise<StudyPlan | undefined> {
    const plan = await this.getStudyPlanById(id);
    if (!plan) return undefined;

    const updatedPlan = {
      ...plan,
      ...planData,
      updatedAt: new Date(),
    };

    this.studyPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deleteStudyPlan(id: number): Promise<boolean> {
    return this.studyPlans.delete(id);
  }

  // User statistics methods
  async getUserStats(userId: number): Promise<any | undefined> {
    return Array.from(this.userStatsMap.values()).find(
      (stats) => stats.userId === userId,
    );
  }

  async updateUserStats(
    userId: number,
    statsData: Partial<any>,
  ): Promise<any | undefined> {
    const stats = await this.getUserStats(userId);

    if (!stats) {
      // Create new stats if not exist
      const id = this.currentUserStatsId++;
      const newStats = {
        id,
        userId,
        totalStudyTime: 0,
        quizzesCompleted: 0,
        averageScore: 0,
        documentsUploaded: 0,
        flashcardsCreated: 0,
        codeSnippetsGenerated: 0,
        questionsAsked: 0,
        streakDays: 0,
        lastActive: new Date(),
        ...statsData,
      };
      this.userStatsMap.set(id, newStats);
      return newStats;
    }

    const updatedStats = {
      ...stats,
      ...statsData,
      lastActive: new Date(),
    };

    this.userStatsMap.set(stats.id, updatedStats);
    return updatedStats;
  }

  // Summary methods (not implemented for MemStorage)
  async createSummary(_summary: any): Promise<any> {
    throw new Error('Summary methods not implemented for MemStorage');
  }

  async getSummaryById(_id: number): Promise<any | undefined> {
    throw new Error('Summary methods not implemented for MemStorage');
  }

  async getSummariesByUserId(_userId: number): Promise<any[]> {
    throw new Error('Summary methods not implemented for MemStorage');
  }

  async getSummariesByDocumentId(_documentId: number): Promise<any[]> {
    throw new Error('Summary methods not implemented for MemStorage');
  }

  async updateSummary(_id: number, _summary: Partial<any>): Promise<any | undefined> {
    throw new Error('Summary methods not implemented for MemStorage');
  }

  async deleteSummary(_id: number): Promise<boolean> {
    throw new Error('Summary methods not implemented for MemStorage');
  }

  // Quiz attempts methods (not implemented for MemStorage)
  async createQuizAttempt(_attempt: any): Promise<any> {
    throw new Error('Quiz attempt methods not implemented for MemStorage');
  }

  async getQuizAttemptsByUserId(_userId: number, _limit?: number): Promise<any[]> {
    throw new Error('Quiz attempt methods not implemented for MemStorage');
  }

  async getQuizStatsByUserId(_userId: number): Promise<any> {
    throw new Error('Quiz attempt methods not implemented for MemStorage');
  }

  // Feedback methods (not implemented for MemStorage)
  async createFeedback(_feedback: any): Promise<any> {
    throw new Error('Feedback methods not implemented for MemStorage');
  }

  async getFeedbackByMessageId(_messageId: number, _userId: number): Promise<any | undefined> {
    throw new Error('Feedback methods not implemented for MemStorage');
  }

  // Deck methods
  async createDeck(insertDeck: any): Promise<any> {
    const id = this.currentDeckId++;
    const now = new Date();
    const deck = {
      id,
      userId: insertDeck.userId,
      name: insertDeck.name,
      description: insertDeck.description || null,
      isPublic: insertDeck.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.decks.set(id, deck);
    return deck;
  }

  async getDeckById(id: number): Promise<any | undefined> {
    return this.decks.get(id);
  }

  async getDecksByUserId(userId: number): Promise<any[]> {
    return Array.from(this.decks.values()).filter(
      (deck) => deck.userId === userId,
    );
  }

  async updateDeck(id: number, deckData: Partial<any>): Promise<any | undefined> {
    const deck = await this.getDeckById(id);
    if (!deck) return undefined;

    const updatedDeck = {
      ...deck,
      ...deckData,
      updatedAt: new Date(),
    };

    this.decks.set(id, updatedDeck);
    return updatedDeck;
  }

  async deleteDeck(id: number): Promise<boolean> {
    // Also delete all deck_flashcards entries for this deck
    const keysToDelete: string[] = [];
    this.deckFlashcards.forEach((_, key) => {
      const [deckId] = key.split('-');
      if (parseInt(deckId) === id) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.deckFlashcards.delete(key));
    
    return this.decks.delete(id);
  }

  async getFlashcardsByDeckId(deckId: number): Promise<Flashcard[]> {
    const deckFlashcardEntries: Array<{ flashcardId: number; position: number }> = [];
    
    this.deckFlashcards.forEach((entry, key) => {
      const [dId] = key.split('-');
      if (parseInt(dId) === deckId) {
        deckFlashcardEntries.push({
          flashcardId: entry.flashcardId,
          position: entry.position,
        });
      }
    });

    // Sort by position
    deckFlashcardEntries.sort((a, b) => a.position - b.position);

    // Get the actual flashcards
    const flashcardList: Flashcard[] = [];
    for (const entry of deckFlashcardEntries) {
      const flashcard = this.flashcards.get(entry.flashcardId);
      if (flashcard) {
        flashcardList.push(flashcard);
      }
    }

    return flashcardList;
  }

  async addCardToDeck(deckId: number, flashcardId: number, position: number = 0): Promise<any> {
    const key = `${deckId}-${flashcardId}`;
    const now = new Date();
    const entry = {
      deckId,
      flashcardId,
      position,
      addedAt: now,
    };
    this.deckFlashcards.set(key, entry);
    return entry;
  }

  async getDeckIdsForFlashcard(flashcardId: number): Promise<number[]> {
    const deckIds: number[] = [];
    for (const [, entry] of this.deckFlashcards) {
      if (entry.flashcardId === flashcardId) {
        deckIds.push(entry.deckId);
      }
    }
    return deckIds;
  }

  async removeCardFromDeck(deckId: number, flashcardId: number): Promise<boolean> {
    const key = `${deckId}-${flashcardId}`;
    return this.deckFlashcards.delete(key);
  }

  // Refresh token methods
  async createRefreshToken(insertRefreshToken: InsertRefreshToken): Promise<RefreshToken> {
    const id = this.currentRefreshTokenId++;
    const now = new Date();
    const refreshToken: RefreshToken = {
      id,
      userId: insertRefreshToken.userId,
      token: insertRefreshToken.token,
      expiresAt: insertRefreshToken.expiresAt,
      createdAt: now,
      userAgent: insertRefreshToken.userAgent || null,
      ipAddress: insertRefreshToken.ipAddress || null,
    };
    this.refreshTokensMap.set(id, refreshToken);
    return refreshToken;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    return Array.from(this.refreshTokensMap.values()).find(
      (rt) => rt.token === token,
    );
  }

  async deleteRefreshToken(token: string): Promise<boolean> {
    const refreshToken = await this.getRefreshToken(token);
    if (!refreshToken) return false;
    return this.refreshTokensMap.delete(refreshToken.id);
  }

  async deleteAllUserRefreshTokens(userId: number): Promise<boolean> {
    const tokensToDelete: number[] = [];
    this.refreshTokensMap.forEach((token, id) => {
      if (token.userId === userId) {
        tokensToDelete.push(id);
      }
    });
    tokensToDelete.forEach(id => this.refreshTokensMap.delete(id));
    return true;
  }

  // Email log methods
  async createEmailLog(insertEmailLog: InsertEmailLog): Promise<EmailLog> {
    const id = this.currentEmailLogId++;
    const now = new Date();
    const emailLog: EmailLog = {
      id,
      userId: insertEmailLog.userId || null,
      emailType: insertEmailLog.emailType,
      recipient: insertEmailLog.recipient,
      subject: insertEmailLog.subject,
      status: insertEmailLog.status,
      errorMessage: insertEmailLog.errorMessage || null,
      sentAt: now,
    };
    this.emailLogsMap.set(id, emailLog);
    return emailLog;
  }

  async getRecentEmailLogs(userId: number, emailType: string, minutesAgo: number): Promise<EmailLog[]> {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
    return Array.from(this.emailLogsMap.values()).filter(
      (log) => 
        log.userId === userId && 
        log.emailType === emailType && 
        log.sentAt >= cutoffTime
    );
  }

  // Security audit log methods
  async createSecurityAuditLog(insertAuditLog: InsertSecurityAuditLog): Promise<SecurityAuditLog> {
    const id = this.currentSecurityAuditLogId++;
    const now = new Date();
    const auditLog: SecurityAuditLog = {
      id,
      userId: insertAuditLog.userId || null,
      action: insertAuditLog.action,
      status: insertAuditLog.status,
      ipAddress: insertAuditLog.ipAddress || null,
      userAgent: insertAuditLog.userAgent || null,
      details: insertAuditLog.details || null,
      createdAt: now,
    };
    this.securityAuditLogsMap.set(id, auditLog);
    return auditLog;
  }

  async getSecurityAuditLogsByUser(userId: number, limit?: number): Promise<SecurityAuditLog[]> {
    const logs = Array.from(this.securityAuditLogsMap.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (limit) {
      return logs.slice(0, limit);
    }
    return logs;
  }
}

// MySQL Storage implementation using Drizzle ORM
export class MySQLStorage implements IStorage {
  constructor() {
    // Constructor - db instance is imported from db/index.ts
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return user;
    } catch (error) {
      console.error('[DB Error] Operation: getUser, Table: users, ID:', id, 'Error:', error);
      throw new Error('Failed to fetch user from database');
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      return user;
    } catch (error) {
      console.error('[DB Error] Operation: getUserByUsername, Table: users, Username:', username, 'Error:', error);
      throw new Error('Failed to fetch user by username');
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return user;
    } catch (error) {
      console.error('[DB Error] Operation: getUserByEmail, Table: users, Email:', email, 'Error:', error);
      throw new Error('Failed to fetch user by email');
    }
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token))
        .limit(1);
      return user;
    } catch (error) {
      console.error('[DB Error] Operation: getUserByVerificationToken, Table: users, Error:', error);
      throw new Error('Failed to fetch user by verification token');
    }
  }

  async getUserByVerificationOtp(otp: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationOtp, otp))
        .limit(1);
      return user;
    } catch (error) {
      console.error('[DB Error] Operation: getUserByVerificationOtp, Table: users, Error:', error);
      throw new Error('Failed to fetch user by verification OTP');
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetToken, token))
        .limit(1);
      return user;
    } catch (error) {
      console.error('[DB Error] Operation: getUserByResetToken, Table: users, Error:', error);
      throw new Error('Failed to fetch user by reset token');
    }
  }

  async getUserByResetOtp(otp: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetOtp, otp))
        .limit(1);
      return user;
    } catch (error) {
      console.error('[DB Error] Operation: getUserByResetOtp, Table: users, Error:', error);
      throw new Error('Failed to fetch user by reset OTP');
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const now = new Date();
      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      
      // Fetch the created user
      return await this.getUser(toNumberId(user.id)) as User;
    } catch (error) {
      console.error('[DB Error] Operation: createUser, Table: users, Username:', insertUser.username, 'Error:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const now = new Date();
      await db
        .update(users)
        .set({
          ...userData,
          updatedAt: now,
        })
        .where(eq(users.id, id));
      
      return await this.getUser(id);
    } catch (error) {
      console.error('[DB Error] Operation: updateUser, Table: users, UserID:', id, 'Error:', error);
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: deleteUser, Table: users, UserID:', id, 'Error:', error);
      throw new Error('Failed to delete user');
    }
  }

  // Document methods
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    try {
      const now = new Date();
      const [document] = await db
        .insert(documents)
        .values({
          ...insertDocument,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      
      return await this.getDocumentById(toNumberId(document.id)) as Document;
    } catch (error) {
      console.error('[DB Error] Operation: createDocument, Table: documents, UserID:', insertDocument.userId, 'Error:', error);
      throw new Error('Failed to create document');
    }
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    try {
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .limit(1);
      return document;
    } catch (error) {
      console.error('[DB Error] Operation: getDocumentById, Table: documents, ID:', id, 'Error:', error);
      throw new Error('Failed to fetch document');
    }
  }

  async getDocumentsByUserId(userId: number, page: number = 1, limit: number = 20): Promise<{ documents: Document[], total: number, page: number, totalPages: number }> {
    try {
      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(documents)
        .where(eq(documents.userId, userId));
      
      // Get paginated results
      const offset = (page - 1) * limit;
      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.userId, userId))
        .orderBy(desc(documents.createdAt))
        .limit(limit)
        .offset(offset);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        documents: docs,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('[DB Error] Operation: getDocumentsByUserId, Table: documents, UserID:', userId, 'Error:', error);
      throw new Error('Failed to fetch documents');
    }
  }

  async updateDocument(id: number, documentData: Partial<Document>): Promise<Document | undefined> {
    try {
      const now = new Date();
      await db
        .update(documents)
        .set({
          ...documentData,
          updatedAt: now,
        })
        .where(eq(documents.id, id));
      
      return await this.getDocumentById(id);
    } catch (error) {
      console.error('[DB Error] Operation: updateDocument, Table: documents, ID:', id, 'Error:', error);
      throw new Error('Failed to update document');
    }
  }

  async deleteDocument(id: number): Promise<boolean> {
    try {
      await db
        .delete(documents)
        .where(eq(documents.id, id));
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: deleteDocument, Table: documents, ID:', id, 'Error:', error);
      return false;
    }
  }

  // Flashcard methods
  async createFlashcard(insertFlashcard: InsertFlashcard & { userId: number }): Promise<Flashcard> {
    try {
      const now = new Date();
      const [flashcard] = await db
        .insert(flashcards)
        .values({
          ...insertFlashcard,
          createdAt: now,
        })
        .$returningId();
      
      return await this.getFlashcardById(toNumberId(flashcard.id)) as Flashcard;
    } catch (error) {
      console.error('[DB Error] Operation: createFlashcard, Table: flashcards, UserID:', insertFlashcard.userId, 'Error:', error);
      throw new Error('Failed to create flashcard');
    }
  }

  async getFlashcardById(id: number): Promise<Flashcard | undefined> {
    try {
      const [flashcard] = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.id, id))
        .limit(1);
      return flashcard;
    } catch (error) {
      console.error('[DB Error] Operation: getFlashcardById, Table: flashcards, ID:', id, 'Error:', error);
      throw new Error('Failed to fetch flashcard');
    }
  }

  async getFlashcardsByUserId(userId: number, page: number = 1, limit: number = 20): Promise<{ flashcards: Flashcard[], total: number, page: number, totalPages: number }> {
    try {
      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(flashcards)
        .where(eq(flashcards.userId, userId));
      
      // Get paginated results
      const offset = (page - 1) * limit;
      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.userId, userId))
        .orderBy(desc(flashcards.createdAt))
        .limit(limit)
        .offset(offset);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        flashcards: cards,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('[DB Error] Operation: getFlashcardsByUserId, Table: flashcards, UserID:', userId, 'Error:', error);
      throw new Error('Failed to fetch flashcards');
    }
  }

  async getFlashcardsByDocumentId(documentId: number): Promise<Flashcard[]> {
    try {
      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.documentId, documentId))
        .orderBy(desc(flashcards.createdAt));
      return cards;
    } catch (error) {
      console.error('[DB Error] Operation: getFlashcardsByDocumentId, Table: flashcards, DocumentID:', documentId, 'Error:', error);
      throw new Error('Failed to fetch flashcards');
    }
  }

  async updateFlashcard(id: number, flashcardData: Partial<Flashcard>): Promise<Flashcard | undefined> {
    try {
      await db
        .update(flashcards)
        .set(flashcardData)
        .where(eq(flashcards.id, id));
      
      return await this.getFlashcardById(id);
    } catch (error) {
      console.error('[DB Error] Operation: updateFlashcard, Table: flashcards, ID:', id, 'Error:', error);
      throw new Error('Failed to update flashcard');
    }
  }

  async deleteFlashcard(id: number): Promise<boolean> {
    try {
      await db
        .delete(flashcards)
        .where(eq(flashcards.id, id));
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: deleteFlashcard, Table: flashcards, ID:', id, 'Error:', error);
      return false;
    }
  }

  // MCQ methods
  async createMcq(insertMcq: InsertMcq & { userId: number }): Promise<Mcq> {
    try {
      const now = new Date();
      const [mcq] = await db
        .insert(mcqs)
        .values({
          ...insertMcq,
          correctOption: typeof insertMcq.correctOption === "string"
            ? parseInt(insertMcq.correctOption)
            : insertMcq.correctOption,
          createdAt: now,
        })
        .$returningId();
      
      return await this.getMcqById(toNumberId(mcq.id)) as Mcq;
    } catch (error) {
      console.error('[DB Error] Operation: createMcq, Table: mcqs, UserID:', insertMcq.userId, 'Error:', error);
      throw new Error('Failed to create MCQ');
    }
  }

  async getMcqById(id: number): Promise<Mcq | undefined> {
    try {
      const [mcq] = await db
        .select()
        .from(mcqs)
        .where(eq(mcqs.id, id))
        .limit(1);
      return mcq;
    } catch (error) {
      console.error('[DB Error] Operation: getMcqById, Table: mcqs, ID:', id, 'Error:', error);
      throw new Error('Failed to fetch MCQ');
    }
  }

  async getMcqsByUserId(userId: number, page: number = 1, limit: number = 20): Promise<{ mcqs: Mcq[], total: number, page: number, totalPages: number }> {
    try {
      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(mcqs)
        .where(eq(mcqs.userId, userId));
      
      // Get paginated results
      const offset = (page - 1) * limit;
      const mcqList = await db
        .select()
        .from(mcqs)
        .where(eq(mcqs.userId, userId))
        .orderBy(desc(mcqs.createdAt))
        .limit(limit)
        .offset(offset);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        mcqs: mcqList,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('[DB Error] Operation: getMcqsByUserId, Table: mcqs, UserID:', userId, 'Error:', error);
      throw new Error('Failed to fetch MCQs');
    }
  }

  async getMcqsByDocumentId(documentId: number): Promise<Mcq[]> {
    try {
      const mcqList = await db
        .select()
        .from(mcqs)
        .where(eq(mcqs.documentId, documentId))
        .orderBy(desc(mcqs.createdAt));
      return mcqList;
    } catch (error) {
      console.error('[DB Error] Operation: getMcqsByDocumentId, Table: mcqs, DocumentID:', documentId, 'Error:', error);
      throw new Error('Failed to fetch MCQs');
    }
  }

  async getMcqsByDifficulty(userId: number, difficulty: string): Promise<Mcq[]> {
    try {
      const mcqList = await db
        .select()
        .from(mcqs)
        .where(and(eq(mcqs.userId, userId), eq(mcqs.difficulty, difficulty)))
        .orderBy(desc(mcqs.createdAt));
      return mcqList;
    } catch (error) {
      console.error('[DB Error] Operation: getMcqsByDifficulty, Table: mcqs, UserID:', userId, 'Difficulty:', difficulty, 'Error:', error);
      throw new Error('Failed to fetch MCQs by difficulty');
    }
  }

  async updateMcq(id: number, mcqData: Partial<Mcq>): Promise<Mcq | undefined> {
    try {
      await db
        .update(mcqs)
        .set(mcqData)
        .where(eq(mcqs.id, id));
      
      return await this.getMcqById(id);
    } catch (error) {
      console.error('[DB Error] Operation: updateMcq, Table: mcqs, ID:', id, 'Error:', error);
      throw new Error('Failed to update MCQ');
    }
  }

  async deleteMcq(id: number): Promise<boolean> {
    try {
      await db
        .delete(mcqs)
        .where(eq(mcqs.id, id));
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: deleteMcq, Table: mcqs, ID:', id, 'Error:', error);
      return false;
    }
  }

  // Code snippet methods
  async createCodeSnippet(insertSnippet: InsertCodeSnippet): Promise<CodeSnippet> {
    try {
      const now = new Date();
      const [snippet] = await db
        .insert(codeSnippets)
        .values({
          ...insertSnippet,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      
      return await this.getCodeSnippetById(toNumberId(snippet.id)) as CodeSnippet;
    } catch (error) {
      console.error('[DB Error] Operation: createCodeSnippet, Table: codeSnippets, UserID:', insertSnippet.userId, 'Error:', error);
      throw new Error('Failed to create code snippet');
    }
  }

  async getCodeSnippetById(id: number): Promise<CodeSnippet | undefined> {
    try {
      const [snippet] = await db
        .select()
        .from(codeSnippets)
        .where(eq(codeSnippets.id, id))
        .limit(1);
      return snippet;
    } catch (error) {
      console.error('[DB Error] Operation: getCodeSnippetById, Table: codeSnippets, ID:', id, 'Error:', error);
      throw new Error('Failed to fetch code snippet');
    }
  }

  async getCodeSnippetsByUserId(userId: number, page: number = 1, limit: number = 20): Promise<{ snippets: CodeSnippet[], total: number, page: number, totalPages: number }> {
    try {
      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(codeSnippets)
        .where(eq(codeSnippets.userId, userId));
      
      // Get paginated results
      const offset = (page - 1) * limit;
      const snippets = await db
        .select()
        .from(codeSnippets)
        .where(eq(codeSnippets.userId, userId))
        .orderBy(desc(codeSnippets.createdAt))
        .limit(limit)
        .offset(offset);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        snippets,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('[DB Error] Operation: getCodeSnippetsByUserId, Table: codeSnippets, UserID:', userId, 'Error:', error);
      throw new Error('Failed to fetch code snippets');
    }
  }

  async updateCodeSnippet(id: number, snippetData: Partial<CodeSnippet>): Promise<CodeSnippet | undefined> {
    try {
      const now = new Date();
      await db
        .update(codeSnippets)
        .set({
          ...snippetData,
          updatedAt: now,
        })
        .where(eq(codeSnippets.id, id));
      
      return await this.getCodeSnippetById(id);
    } catch (error) {
      console.error('[DB Error] Operation: updateCodeSnippet, Table: codeSnippets, ID:', id, 'Error:', error);
      throw new Error('Failed to update code snippet');
    }
  }

  async deleteCodeSnippet(id: number): Promise<boolean> {
    try {
      await db
        .delete(codeSnippets)
        .where(eq(codeSnippets.id, id));
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: deleteCodeSnippet, Table: codeSnippets, ID:', id, 'Error:', error);
      return false;
    }
  }

  // Chat history methods
  async createChatHistory(insertHistory: InsertChatHistory): Promise<ChatHistory> {
    try {
      const now = new Date();
      const [history] = await db
        .insert(chatHistory)
        .values({
          ...insertHistory,
          messages: insertHistory.messages || [],
          lastUpdated: now,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      
      return await this.getChatHistoryById(toNumberId(history.id)) as ChatHistory;
    } catch (error) {
      console.error('Error creating chat history:', error);
      throw new Error('Failed to create chat history');
    }
  }

  async getChatHistoryById(id: number): Promise<ChatHistory | undefined> {
    try {
      const [history] = await db
        .select()
        .from(chatHistory)
        .where(eq(chatHistory.id, id))
        .limit(1);
      return history;
    } catch (error) {
      console.error(`Error fetching chat history ${id}:`, error);
      throw new Error('Failed to fetch chat history');
    }
  }

  async getChatHistoriesByUserId(userId: number): Promise<ChatHistory[]> {
    try {
      const histories = await db
        .select({
          id: chatHistory.id,
          userId: chatHistory.userId,
          sessionId: chatHistory.sessionId,
          subject: chatHistory.subject,
          lastUpdated: chatHistory.lastUpdated,
          createdAt: chatHistory.createdAt,
          updatedAt: chatHistory.updatedAt,
        })
        .from(chatHistory)
        .where(eq(chatHistory.userId, userId))
        .orderBy(desc(chatHistory.lastUpdated));
      
      return histories.map(h => ({ ...h, messages: [] })) as ChatHistory[];
    } catch (error) {
      console.error(`Error fetching chat histories for user ${userId}:`, error);
      throw new Error('Failed to fetch chat histories');
    }
  }

  async updateChatHistory(id: number, message: ChatMessage): Promise<ChatHistory | undefined> {
    try {
      const history = await this.getChatHistoryById(id);
      if (!history) return undefined;

      const messages = Array.isArray(history.messages)
        ? [...history.messages, message]
        : [message];
      const now = new Date();

      await db
        .update(chatHistory)
        .set({
          messages,
          lastUpdated: now,
          updatedAt: now,
        })
        .where(eq(chatHistory.id, id));
      
      return await this.getChatHistoryById(id);
    } catch (error) {
      console.error(`Error updating chat history ${id}:`, error);
      throw new Error('Failed to update chat history');
    }
  }

  async updateChatHistorySubject(id: number, subject: string): Promise<ChatHistory | undefined> {
    try {
      await db
        .update(chatHistory)
        .set({
          subject,
          updatedAt: new Date(),
        })
        .where(eq(chatHistory.id, id));
      
      return await this.getChatHistoryById(id);
    } catch (error) {
      console.error(`Error updating chat history subject ${id}:`, error);
      throw new Error('Failed to update chat history subject');
    }
  }

  async deleteChatHistory(id: number): Promise<void> {
    try {
      await db
        .delete(chatHistory)
        .where(eq(chatHistory.id, id));
    } catch (error) {
      console.error(`Error deleting chat history ${id}:`, error);
      throw new Error('Failed to delete chat history');
    }
  }

  // Study plan methods
  async createStudyPlan(insertPlan: InsertStudyPlan): Promise<StudyPlan> {
    try {
      const now = new Date();
      const [plan] = await db
        .insert(studyPlans)
        .values({
          ...insertPlan,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      
      return await this.getStudyPlanById(toNumberId(plan.id)) as StudyPlan;
    } catch (error) {
      console.error('Error creating study plan:', error);
      throw new Error('Failed to create study plan');
    }
  }

  async getStudyPlanById(id: number): Promise<StudyPlan | undefined> {
    try {
      const [plan] = await db
        .select()
        .from(studyPlans)
        .where(eq(studyPlans.id, id))
        .limit(1);
      return plan;
    } catch (error) {
      console.error(`Error fetching study plan ${id}:`, error);
      throw new Error('Failed to fetch study plan');
    }
  }

  async getStudyPlansByUserId(userId: number): Promise<StudyPlan[]> {
    try {
      const plans = await db
        .select()
        .from(studyPlans)
        .where(eq(studyPlans.userId, userId))
        .orderBy(desc(studyPlans.createdAt));
      return plans;
    } catch (error) {
      console.error(`Error fetching study plans for user ${userId}:`, error);
      throw new Error('Failed to fetch study plans');
    }
  }

  async updateStudyPlan(id: number, planData: Partial<StudyPlan>): Promise<StudyPlan | undefined> {
    try {
      const now = new Date();
      await db
        .update(studyPlans)
        .set({
          ...planData,
          updatedAt: now,
        })
        .where(eq(studyPlans.id, id));
      
      return await this.getStudyPlanById(id);
    } catch (error) {
      console.error(`Error updating study plan ${id}:`, error);
      throw new Error('Failed to update study plan');
    }
  }

  async deleteStudyPlan(id: number): Promise<boolean> {
    try {
      await db
        .delete(studyPlans)
        .where(eq(studyPlans.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting study plan ${id}:`, error);
      return false;
    }
  }

  // User statistics methods
  async getUserStats(userId: number): Promise<any | undefined> {
    try {
      const [stats] = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .limit(1);
      return stats;
    } catch (error) {
      console.error(`Error fetching user stats for user ${userId}:`, error);
      throw new Error('Failed to fetch user stats');
    }
  }

  async updateUserStats(userId: number, statsData: Partial<any>): Promise<any | undefined> {
    try {
      const stats = await this.getUserStats(userId);

      if (!stats) {
        // Create new stats if not exist
        const now = new Date();
        await db
          .insert(userStats)
          .values({
            userId,
            totalStudyTime: 0,
            quizzesCompleted: 0,
            averageScore: 0,
            documentsUploaded: 0,
            flashcardsCreated: 0,
            flashcardsReviewed: 0,
            correctFlashcards: 0,
            incorrectFlashcards: 0,
            codeSnippetsGenerated: 0,
            questionsAsked: 0,
            streakDays: 0,
            longestStreak: 0,
            xpPoints: 0,
            level: 1,
            lastActive: now,
            updatedAt: now,
            ...statsData,
          })
          .$returningId();
        
        return await this.getUserStats(userId);
      }

      const now = new Date();
      await db
        .update(userStats)
        .set({
          ...statsData,
          lastActive: now,
          updatedAt: now,
        })
        .where(eq(userStats.userId, userId));
      
      return await this.getUserStats(userId);
    } catch (error) {
      console.error(`Error updating user stats for user ${userId}:`, error);
      throw new Error('Failed to update user stats');
    }
  }

  // Summary methods
  async createSummary(insertSummary: InsertSummary): Promise<Summary> {
    try {
      const now = new Date();
      const [summary] = await db
        .insert(summaries)
        .values({
          ...insertSummary,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      
      return await this.getSummaryById(toNumberId(summary.id)) as Summary;
    } catch (error) {
      console.error('Error creating summary:', error);
      throw new Error('Failed to create summary');
    }
  }

  async getSummaryById(id: number): Promise<Summary | undefined> {
    try {
      const [summary] = await db
        .select()
        .from(summaries)
        .where(eq(summaries.id, id))
        .limit(1);
      return summary;
    } catch (error) {
      console.error(`Error fetching summary ${id}:`, error);
      throw new Error('Failed to fetch summary');
    }
  }

  async getSummariesByUserId(userId: number): Promise<Summary[]> {
    try {
      const summaryList = await db
        .select()
        .from(summaries)
        .where(eq(summaries.userId, userId))
        .orderBy(desc(summaries.createdAt));
      return summaryList;
    } catch (error) {
      console.error(`Error fetching summaries for user ${userId}:`, error);
      throw new Error('Failed to fetch summaries');
    }
  }

  async getSummariesByDocumentId(documentId: number): Promise<Summary[]> {
    try {
      const summaryList = await db
        .select()
        .from(summaries)
        .where(eq(summaries.documentId, documentId))
        .orderBy(desc(summaries.createdAt));
      return summaryList;
    } catch (error) {
      console.error(`Error fetching summaries for document ${documentId}:`, error);
      throw new Error('Failed to fetch summaries');
    }
  }

  async updateSummary(id: number, summaryData: Partial<Summary>): Promise<Summary | undefined> {
    try {
      const now = new Date();
      await db
        .update(summaries)
        .set({
          ...summaryData,
          updatedAt: now,
        })
        .where(eq(summaries.id, id));
      
      return await this.getSummaryById(id);
    } catch (error) {
      console.error(`Error updating summary ${id}:`, error);
      throw new Error('Failed to update summary');
    }
  }

  async deleteSummary(id: number): Promise<boolean> {
    try {
      await db
        .delete(summaries)
        .where(eq(summaries.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting summary ${id}:`, error);
      return false;
    }
  }

  // Quiz attempts methods
  async createQuizAttempt(attemptData: any): Promise<any> {
    try {
      const { quizAttempts } = await import('@shared/schema');
      const now = new Date();
      const [attempt] = await db
        .insert(quizAttempts)
        .values({
          ...attemptData,
          createdAt: now,
        })
        .$returningId();
      
      return { id: toNumberId(attempt.id), ...attemptData, createdAt: now };
    } catch (error) {
      console.error('Error creating quiz attempt:', error);
      throw new Error('Failed to create quiz attempt');
    }
  }

  async getQuizAttemptsByUserId(userId: number, limit: number = 50): Promise<any[]> {
    try {
      const { quizAttempts } = await import('@shared/schema');
      const attempts = await db
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
        .orderBy(desc(quizAttempts.createdAt))
        .limit(limit);
      return attempts;
    } catch (error) {
      console.error(`Error fetching quiz attempts for user ${userId}:`, error);
      throw new Error('Failed to fetch quiz attempts');
    }
  }

  async getQuizStatsByUserId(userId: number): Promise<any> {
    try {
      const attempts = await this.getQuizAttemptsByUserId(userId, 100);
      
      if (attempts.length === 0) {
        return {
          totalAttempts: 0,
          averageScore: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          completionRate: 0,
          byCategory: {},
          byDifficulty: {},
          recentAttempts: [],
          improvementTrend: []
        };
      }

      // Calculate overall stats
      const totalAttempts = attempts.length;
      const totalScore = attempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0);
      const averageScore = Math.round(totalScore / totalAttempts);
      const totalQuestions = attempts.reduce((sum: number, a: any) => sum + (a.totalQuestions || 0), 0);
      const totalCorrect = attempts.reduce((sum: number, a: any) => sum + (a.correctAnswers || 0), 0);
      const completionRate = attempts.filter((a: any) => a.completed).length / totalAttempts * 100;

      // Group by category
      const byCategory: Record<string, any> = {};
      attempts.forEach((attempt: any) => {
        const cat = attempt.category || 'general';
        if (!byCategory[cat]) {
          byCategory[cat] = { attempts: 0, totalScore: 0, totalQuestions: 0, correctAnswers: 0 };
        }
        byCategory[cat].attempts++;
        byCategory[cat].totalScore += attempt.score || 0;
        byCategory[cat].totalQuestions += attempt.totalQuestions || 0;
        byCategory[cat].correctAnswers += attempt.correctAnswers || 0;
      });

      // Calculate averages for each category
      Object.keys(byCategory).forEach(cat => {
        byCategory[cat].averageScore = Math.round(byCategory[cat].totalScore / byCategory[cat].attempts);
        byCategory[cat].accuracy = byCategory[cat].totalQuestions > 0 
          ? Math.round((byCategory[cat].correctAnswers / byCategory[cat].totalQuestions) * 100)
          : 0;
      });

      // Group by difficulty
      const byDifficulty: Record<string, any> = {};
      attempts.forEach((attempt: any) => {
        const diff = attempt.difficulty || 'medium';
        if (!byDifficulty[diff]) {
          byDifficulty[diff] = { attempts: 0, totalScore: 0, totalQuestions: 0, correctAnswers: 0 };
        }
        byDifficulty[diff].attempts++;
        byDifficulty[diff].totalScore += attempt.score || 0;
        byDifficulty[diff].totalQuestions += attempt.totalQuestions || 0;
        byDifficulty[diff].correctAnswers += attempt.correctAnswers || 0;
      });

      // Calculate averages for each difficulty
      Object.keys(byDifficulty).forEach(diff => {
        byDifficulty[diff].averageScore = Math.round(byDifficulty[diff].totalScore / byDifficulty[diff].attempts);
        byDifficulty[diff].accuracy = byDifficulty[diff].totalQuestions > 0
          ? Math.round((byDifficulty[diff].correctAnswers / byDifficulty[diff].totalQuestions) * 100)
          : 0;
      });

      // Get recent attempts (last 10)
      const recentAttempts = attempts.slice(0, 10).map((a: any) => ({
        id: a.id,
        score: a.score,
        totalQuestions: a.totalQuestions,
        correctAnswers: a.correctAnswers,
        category: a.category,
        difficulty: a.difficulty,
        timeSpent: a.timeSpent,
        createdAt: a.createdAt
      }));

      // Calculate improvement trend (last 10 attempts)
      const improvementTrend = attempts.slice(0, 10).reverse().map((a: any, index: number) => ({
        attempt: index + 1,
        score: a.score,
        date: a.createdAt
      }));

      return {
        totalAttempts,
        averageScore,
        totalQuestions,
        totalCorrect,
        completionRate: Math.round(completionRate),
        byCategory,
        byDifficulty,
        recentAttempts,
        improvementTrend
      };
    } catch (error) {
      console.error(`Error calculating quiz stats for user ${userId}:`, error);
      throw new Error('Failed to calculate quiz stats');
    }
  }

  // Feedback methods
  async createFeedback(feedbackData: any): Promise<any> {
    try {
      const { feedback } = await import("@shared/schema");
      const now = new Date();
      const [newFeedback] = await db
        .insert(feedback)
        .values({
          ...feedbackData,
          createdAt: now,
        })
        .$returningId();
      
      return { id: toNumberId(newFeedback.id), ...feedbackData, createdAt: now };
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw new Error('Failed to create feedback');
    }
  }

  async getFeedbackByMessageId(messageId: number, userId: number): Promise<any | undefined> {
    try {
      const { feedback } = await import("@shared/schema");
      const [result] = await db
        .select()
        .from(feedback)
        .where(and(eq(feedback.messageId, messageId), eq(feedback.userId, userId)))
        .limit(1);
      return result;
    } catch (error) {
      console.error(`Error fetching feedback for message ${messageId}:`, error);
      throw new Error('Failed to fetch feedback');
    }
  }

  // Deck methods
  async createDeck(insertDeck: any): Promise<any> {
    try {
      const { flashcardDecks } = await import("@shared/schema");
      const now = new Date();
      const [deck] = await db
        .insert(flashcardDecks)
        .values({
          ...insertDeck,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      
      return await this.getDeckById(toNumberId(deck.id));
    } catch (error) {
      console.error('[DB Error] Operation: createDeck, Table: flashcard_decks, UserID:', insertDeck.userId, 'Error:', error);
      throw new Error('Failed to create deck');
    }
  }

  async getDeckById(id: number): Promise<any | undefined> {
    try {
      const { flashcardDecks } = await import("@shared/schema");
      const [deck] = await db
        .select()
        .from(flashcardDecks)
        .where(eq(flashcardDecks.id, id))
        .limit(1);
      return deck;
    } catch (error) {
      console.error('[DB Error] Operation: getDeckById, Table: flashcard_decks, ID:', id, 'Error:', error);
      throw new Error('Failed to fetch deck');
    }
  }

  async getDecksByUserId(userId: number): Promise<any[]> {
    try {
      const { flashcardDecks } = await import("@shared/schema");
      const decks = await db
        .select()
        .from(flashcardDecks)
        .where(eq(flashcardDecks.userId, userId))
        .orderBy(desc(flashcardDecks.createdAt));
      return decks;
    } catch (error) {
      console.error('[DB Error] Operation: getDecksByUserId, Table: flashcard_decks, UserID:', userId, 'Error:', error);
      throw new Error('Failed to fetch decks');
    }
  }

  async updateDeck(id: number, deckData: Partial<any>): Promise<any | undefined> {
    try {
      const { flashcardDecks } = await import("@shared/schema");
      const now = new Date();
      await db
        .update(flashcardDecks)
        .set({
          ...deckData,
          updatedAt: now,
        })
        .where(eq(flashcardDecks.id, id));
      
      return await this.getDeckById(id);
    } catch (error) {
      console.error('[DB Error] Operation: updateDeck, Table: flashcard_decks, ID:', id, 'Error:', error);
      throw new Error('Failed to update deck');
    }
  }

  async deleteDeck(id: number): Promise<boolean> {
    try {
      const { flashcardDecks } = await import("@shared/schema");
      await db
        .delete(flashcardDecks)
        .where(eq(flashcardDecks.id, id));
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: deleteDeck, Table: flashcard_decks, ID:', id, 'Error:', error);
      return false;
    }
  }

  async getFlashcardsByDeckId(deckId: number): Promise<Flashcard[]> {
    try {
      const { deckFlashcards } = await import("@shared/schema");
      
      // Get flashcard IDs from junction table, ordered by position
      const deckFlashcardEntries = await db
        .select()
        .from(deckFlashcards)
        .where(eq(deckFlashcards.deckId, deckId))
        .orderBy(deckFlashcards.position);
      
      // Get the actual flashcards
      const flashcardList: Flashcard[] = [];
      for (const entry of deckFlashcardEntries) {
        const flashcard = await this.getFlashcardById(entry.flashcardId);
        if (flashcard) {
          flashcardList.push(flashcard);
        }
      }
      
      return flashcardList;
    } catch (error) {
      console.error('[DB Error] Operation: getFlashcardsByDeckId, Table: deck_flashcards, DeckID:', deckId, 'Error:', error);
      throw new Error('Failed to fetch flashcards by deck');
    }
  }

  async addCardToDeck(deckId: number, flashcardId: number, position: number = 0): Promise<any> {
    try {
      const { deckFlashcards } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const now = new Date();
      
      // Check if card already exists in deck
      const existing = await db
        .select()
        .from(deckFlashcards)
        .where(and(
          eq(deckFlashcards.deckId, deckId),
          eq(deckFlashcards.flashcardId, flashcardId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        throw new Error('Card already exists in this deck');
      }
      
      await db
        .insert(deckFlashcards)
        .values({
          deckId,
          flashcardId,
          position,
          addedAt: now,
        });
      
      return { deckId, flashcardId, position, addedAt: now };
    } catch (error: any) {
      console.error('[DB Error] Operation: addCardToDeck, Table: deck_flashcards, DeckID:', deckId, 'FlashcardID:', flashcardId, 'Error:', error);
      
      // Return more specific error message
      if (error.message === 'Card already exists in this deck') {
        throw error;
      }
      
      throw new Error('Failed to add card to deck');
    }
  }

  async getDeckIdsForFlashcard(flashcardId: number): Promise<number[]> {
    try {
      const { deckFlashcards } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const results = await db
        .select({ deckId: deckFlashcards.deckId })
        .from(deckFlashcards)
        .where(eq(deckFlashcards.flashcardId, flashcardId));
      
      return results.map((r: { deckId: number }) => r.deckId);
    } catch (error) {
      console.error('[DB Error] Operation: getDeckIdsForFlashcard, Table: deck_flashcards, FlashcardID:', flashcardId, 'Error:', error);
      throw new Error('Failed to get deck IDs for flashcard');
    }
  }

  async removeCardFromDeck(deckId: number, flashcardId: number): Promise<boolean> {
    try {
      const { deckFlashcards } = await import("@shared/schema");
      
      await db
        .delete(deckFlashcards)
        .where(and(
          eq(deckFlashcards.deckId, deckId),
          eq(deckFlashcards.flashcardId, flashcardId)
        ));
      
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: removeCardFromDeck, Table: deck_flashcards, DeckID:', deckId, 'FlashcardID:', flashcardId, 'Error:', error);
      return false;
    }
  }

  // Refresh token methods
  async createRefreshToken(insertRefreshToken: InsertRefreshToken): Promise<RefreshToken> {
    try {
      const [result] = await db
        .insert(refreshTokens)
        .values({
          userId: insertRefreshToken.userId,
          token: insertRefreshToken.token,
          expiresAt: insertRefreshToken.expiresAt,
          userAgent: insertRefreshToken.userAgent || null,
          ipAddress: insertRefreshToken.ipAddress || null,
        });
      
      const [refreshToken] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.id, toNumberId(result.insertId)))
        .limit(1);
      
      return refreshToken;
    } catch (error) {
      console.error('[DB Error] Operation: createRefreshToken, Table: refresh_tokens, Error:', error);
      throw new Error('Failed to create refresh token');
    }
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    try {
      const [refreshToken] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, token))
        .limit(1);
      return refreshToken;
    } catch (error) {
      console.error('[DB Error] Operation: getRefreshToken, Table: refresh_tokens, Error:', error);
      throw new Error('Failed to fetch refresh token');
    }
  }

  async deleteRefreshToken(token: string): Promise<boolean> {
    try {
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.token, token));
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: deleteRefreshToken, Table: refresh_tokens, Error:', error);
      return false;
    }
  }

  async deleteAllUserRefreshTokens(userId: number): Promise<boolean> {
    try {
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, userId));
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: deleteAllUserRefreshTokens, Table: refresh_tokens, UserID:', userId, 'Error:', error);
      return false;
    }
  }

  // Email log methods
  async createEmailLog(insertEmailLog: InsertEmailLog): Promise<EmailLog> {
    try {
      const [result] = await db
        .insert(emailLogs)
        .values({
          userId: insertEmailLog.userId || null,
          emailType: insertEmailLog.emailType,
          recipient: insertEmailLog.recipient,
          subject: insertEmailLog.subject,
          status: insertEmailLog.status,
          errorMessage: insertEmailLog.errorMessage || null,
        });
      
      const [emailLog] = await db
        .select()
        .from(emailLogs)
        .where(eq(emailLogs.id, toNumberId(result.insertId)))
        .limit(1);
      
      return emailLog;
    } catch (error) {
      console.error('[DB Error] Operation: createEmailLog, Table: email_logs, Error:', error);
      throw new Error('Failed to create email log');
    }
  }

  async getRecentEmailLogs(userId: number, emailType: string, minutesAgo: number): Promise<EmailLog[]> {
    try {
      const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
      
      const logs = await db
        .select()
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.userId, userId),
            eq(emailLogs.emailType, emailType)
          )
        );
      
      // Filter by time in JavaScript since Drizzle doesn't have a direct >= operator for dates
      return logs.filter((log: EmailLog) => log.sentAt >= cutoffTime);
    } catch (error) {
      console.error('[DB Error] Operation: getRecentEmailLogs, Table: email_logs, UserID:', userId, 'Error:', error);
      throw new Error('Failed to fetch recent email logs');
    }
  }

  // Security audit log methods
  async createSecurityAuditLog(insertAuditLog: InsertSecurityAuditLog): Promise<SecurityAuditLog> {
    try {
      const [result] = await db
        .insert(securityAuditLogs)
        .values({
          userId: insertAuditLog.userId || null,
          action: insertAuditLog.action,
          status: insertAuditLog.status,
          ipAddress: insertAuditLog.ipAddress || null,
          userAgent: insertAuditLog.userAgent || null,
          details: insertAuditLog.details || null,
        });
      
      const [auditLog] = await db
        .select()
        .from(securityAuditLogs)
        .where(eq(securityAuditLogs.id, toNumberId(result.insertId)))
        .limit(1);
      
      return auditLog;
    } catch (error) {
      console.error('[DB Error] Operation: createSecurityAuditLog, Table: security_audit_logs, Error:', error);
      throw new Error('Failed to create security audit log');
    }
  }

  async getSecurityAuditLogsByUser(userId: number, limit?: number): Promise<SecurityAuditLog[]> {
    try {
      let query = db
        .select()
        .from(securityAuditLogs)
        .where(eq(securityAuditLogs.userId, userId))
        .orderBy(desc(securityAuditLogs.createdAt));
      
      if (limit) {
        query = query.limit(limit) as any;
      }
      
      return await query;
    } catch (error) {
      console.error('[DB Error] Operation: getSecurityAuditLogsByUser, Table: security_audit_logs, UserID:', userId, 'Error:', error);
      throw new Error('Failed to fetch security audit logs');
    }
  }

  // Saved quiz methods
  async saveQuiz(userId: number, quizData: any): Promise<any> {
    try {
      const [result] = await db
        .insert(savedQuizzes)
        .values({
          userId,
          category: quizData.category,
          difficulty: quizData.difficulty,
          questionTypes: quizData.questionTypes,
          questionCount: quizData.questionCount,
          title: quizData.title || null,
          description: quizData.description || null,
        });
      
      const [savedQuiz] = await db
        .select()
        .from(savedQuizzes)
        .where(eq(savedQuizzes.id, toNumberId(result.insertId)))
        .limit(1);
      
      return savedQuiz;
    } catch (error) {
      console.error('[DB Error] Operation: saveQuiz, Table: saved_quizzes, UserID:', userId, 'Error:', error);
      throw new Error('Failed to save quiz');
    }
  }

  async getSavedQuizzes(userId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(savedQuizzes)
        .where(eq(savedQuizzes.userId, userId))
        .orderBy(desc(savedQuizzes.savedAt));
    } catch (error) {
      console.error('[DB Error] Operation: getSavedQuizzes, Table: saved_quizzes, UserID:', userId, 'Error:', error);
      throw new Error('Failed to fetch saved quizzes');
    }
  }

  async removeSavedQuiz(userId: number, quizId: number): Promise<boolean> {
    try {
      await db
        .delete(savedQuizzes)
        .where(and(eq(savedQuizzes.id, quizId), eq(savedQuizzes.userId, userId)));
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: removeSavedQuiz, Table: saved_quizzes, QuizID:', quizId, 'Error:', error);
      throw new Error('Failed to remove saved quiz');
    }
  }

  // Favorite quiz methods
  async favoriteQuiz(userId: number, quizData: any): Promise<any> {
    try {
      const [result] = await db
        .insert(favoriteQuizzes)
        .values({
          userId,
          category: quizData.category,
          difficulty: quizData.difficulty,
          questionTypes: quizData.questionTypes,
          questionCount: quizData.questionCount,
          title: quizData.title || null,
          description: quizData.description || null,
        });
      
      const [favoriteQuiz] = await db
        .select()
        .from(favoriteQuizzes)
        .where(eq(favoriteQuizzes.id, toNumberId(result.insertId)))
        .limit(1);
      
      return favoriteQuiz;
    } catch (error) {
      console.error('[DB Error] Operation: favoriteQuiz, Table: favorite_quizzes, UserID:', userId, 'Error:', error);
      throw new Error('Failed to favorite quiz');
    }
  }

  async getFavoriteQuizzes(userId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(favoriteQuizzes)
        .where(eq(favoriteQuizzes.userId, userId))
        .orderBy(desc(favoriteQuizzes.favoritedAt));
    } catch (error) {
      console.error('[DB Error] Operation: getFavoriteQuizzes, Table: favorite_quizzes, UserID:', userId, 'Error:', error);
      throw new Error('Failed to fetch favorite quizzes');
    }
  }

  async removeFavoriteQuiz(userId: number, quizId: number): Promise<boolean> {
    try {
      await db
        .delete(favoriteQuizzes)
        .where(and(eq(favoriteQuizzes.id, quizId), eq(favoriteQuizzes.userId, userId)));
      return true;
    } catch (error) {
      console.error('[DB Error] Operation: removeFavoriteQuiz, Table: favorite_quizzes, QuizID:', quizId, 'Error:', error);
      throw new Error('Failed to remove favorite quiz');
    }
  }

  async isFavoriteQuiz(userId: number, category: string, difficulty: string): Promise<boolean> {
    try {
      const [result] = await db
        .select()
        .from(favoriteQuizzes)
        .where(
          and(
            eq(favoriteQuizzes.userId, userId),
            eq(favoriteQuizzes.category, category),
            eq(favoriteQuizzes.difficulty, difficulty)
          )
        )
        .limit(1);
      
      return !!result;
    } catch (error) {
      console.error('[DB Error] Operation: isFavoriteQuiz, Table: favorite_quizzes, UserID:', userId, 'Error:', error);
      return false;
    }
  }
}

// Export MySQLStorage instance (will be initialized after database connection)
export let storage: IStorage = new MemStorage();

// Function to initialize MySQL storage after database connection is established
export function initializeStorage() {
  storage = new MySQLStorage();
  console.log('MySQLStorage initialized');
}
