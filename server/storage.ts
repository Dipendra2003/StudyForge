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
  quizAttempts,
  type InsertCodeSnippet,
  type CodeSnippet,
  codeSnippets,
  chatHistory,
  type ChatHistory,
  type InsertChatHistory,
  studyPlans,
  type StudyPlan,
  type InsertStudyPlan,
  achievements,
  userStats,
  type ChatMessage,
} from "@shared/schema";

// Interface for all storage CRUD operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;

  // Document methods
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentById(id: number): Promise<Document | undefined>;
  getDocumentsByUserId(userId: number): Promise<Document[]>;
  updateDocument(
    id: number,
    document: Partial<Document>,
  ): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  // Flashcard methods
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  getFlashcardById(id: number): Promise<Flashcard | undefined>;
  getFlashcardsByUserId(userId: number): Promise<Flashcard[]>;
  getFlashcardsByDocumentId(documentId: number): Promise<Flashcard[]>;
  updateFlashcard(
    id: number,
    flashcard: Partial<Flashcard>,
  ): Promise<Flashcard | undefined>;
  deleteFlashcard(id: number): Promise<boolean>;

  // MCQ methods
  createMcq(mcq: InsertMcq): Promise<Mcq>;
  getMcqById(id: number): Promise<Mcq | undefined>;
  getMcqsByUserId(userId: number): Promise<Mcq[]>;
  getMcqsByDocumentId(documentId: number): Promise<Mcq[]>;
  getMcqsByDifficulty(userId: number, difficulty: string): Promise<Mcq[]>;
  updateMcq(id: number, mcq: Partial<Mcq>): Promise<Mcq | undefined>;
  deleteMcq(id: number): Promise<boolean>;

  // Code snippet methods
  createCodeSnippet(snippet: InsertCodeSnippet): Promise<CodeSnippet>;
  getCodeSnippetById(id: number): Promise<CodeSnippet | undefined>;
  getCodeSnippetsByUserId(userId: number): Promise<CodeSnippet[]>;
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private flashcards: Map<number, Flashcard>;
  private mcqs: Map<number, Mcq>;
  private codeSnippets: Map<number, CodeSnippet>;
  private chatHistories: Map<number, ChatHistory>;
  private studyPlans: Map<number, StudyPlan>;
  private achievements: Map<number, any>;
  private userStatsMap: Map<number, any>;

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

  constructor() {
    // Initialize maps
    this.users = new Map();
    this.documents = new Map();
    this.flashcards = new Map();
    this.mcqs = new Map();
    this.codeSnippets = new Map();
    this.chatHistories = new Map();
    this.studyPlans = new Map();
    this.achievements = new Map();
    this.userStatsMap = new Map();

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

  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.userId === userId,
    );
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
  async createFlashcard(insertFlashcard: InsertFlashcard): Promise<Flashcard> {
    const id = this.currentFlashcardId++;
    const now = new Date();
    const flashcard: Flashcard = {
      id,
      userId: insertFlashcard.userId,
      documentId: insertFlashcard.documentId || null,
      question: insertFlashcard.question,
      answer: insertFlashcard.answer,
      tags: insertFlashcard.tags || null,
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

  async getFlashcardsByUserId(userId: number): Promise<Flashcard[]> {
    return Array.from(this.flashcards.values()).filter(
      (card) => card.userId === userId,
    );
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
  async createMcq(insertMcq: InsertMcq): Promise<Mcq> {
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
      difficulty: insertMcq.difficulty,
      category: insertMcq.category || null,
      isPublic: insertMcq.isPublic ?? false,
      createdAt: now,
    };
    this.mcqs.set(id, mcq);
    return mcq;
  }

  async getMcqById(id: number): Promise<Mcq | undefined> {
    return this.mcqs.get(id);
  }

  async getMcqsByUserId(userId: number): Promise<Mcq[]> {
    return Array.from(this.mcqs.values()).filter(
      (mcq) => mcq.userId === userId,
    );
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

  async getCodeSnippetsByUserId(userId: number): Promise<CodeSnippet[]> {
    return Array.from(this.codeSnippets.values()).filter(
      (snippet) => snippet.userId === userId,
    );
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

  // Study plan methods
  async createStudyPlan(insertPlan: InsertStudyPlan): Promise<StudyPlan> {
    const id = this.currentStudyPlanId++;
    const now = new Date();
    const plan: StudyPlan = {
      id,
      userId: insertPlan.userId,
      title: insertPlan.title,
      description: insertPlan.description || null,
      scheduleData: insertPlan.scheduleData,
      startDate: insertPlan.startDate || null,
      endDate: insertPlan.endDate || null,
      completedPercentage: 0,
      status: insertPlan.status || "active",
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
}

export const storage = new MemStorage();
