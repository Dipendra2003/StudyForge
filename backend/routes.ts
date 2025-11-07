import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  userRegistrationSchema, 
  insertUserSchema,
  insertDocumentSchema,
  documentUploadSchema,
  insertFlashcardSchema,
  insertMcqSchema,
  insertCodeSnippetSchema,
  codeGenerationSchema,
  insertChatHistorySchema,
  insertStudyPlanSchema,
  chatMessageSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Helper function to handle API errors
function handleApiError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    const validationError = fromZodError(error);
    return res.status(400).json({ 
      message: "Validation error", 
      errors: validationError.details
    });
  }
  
  console.error("API Error:", error);
  return res.status(500).json({ 
    message: "Internal server error" 
  });
}

// Authentication middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  // For demo purposes, we'll just check if user is in session
  // In a real app, this would validate JWT tokens or session credentials
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized. Please log in first." });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ===== Authentication Endpoints =====
  
  // User registration
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const userData = userRegistrationSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(409).json({ message: "Email address already in use" });
      }
      
      // Create user (in a real app, we'd hash the password here)
      const { confirmPassword, ...userToCreate } = userData;
      const user = await storage.createUser(userToCreate);
      
      // Don't return password in response
      const { password, ...userResponse } = user;
      
      return res.status(201).json({
        message: "User registered successfully",
        user: userResponse
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // User login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set user ID in session
      if (req.session) {
        req.session.userId = user.id;
      }
      
      // Don't return password in response
      const { password: _, ...userResponse } = user;
      
      return res.status(200).json({
        message: "Login successful",
        user: userResponse
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // User logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err: Error | null) => {
        if (err) {
          return res.status(500).json({ message: "Error logging out" });
        }
        
        res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      res.status(200).json({ message: "Logged out successfully" });
    }
  });
  
  // Get current user
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...userResponse } = user;
      
      return res.status(200).json({ user: userResponse });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== Document Management Endpoints =====
  
  // Upload/create document
  app.post('/api/documents', authenticate, async (req: Request, res: Response) => {
    try {
      const docData = documentUploadSchema.parse(req.body);
      const userId = req.session?.userId;
      
      const document = await storage.createDocument({
        ...docData,
        userId
      });
      
      return res.status(201).json({
        message: "Document created successfully",
        document
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get all user documents
  app.get('/api/documents', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      const documents = await storage.getDocumentsByUserId(userId);
      
      return res.status(200).json({ documents });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get document by ID
  app.get('/api/documents/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if document belongs to the user
      if (document.userId !== req.session?.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      return res.status(200).json({ document });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update document
  app.patch('/api/documents/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if document belongs to the user
      if (document.userId !== req.session?.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedDocument = await storage.updateDocument(documentId, req.body);
      
      return res.status(200).json({
        message: "Document updated successfully",
        document: updatedDocument
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Delete document
  app.delete('/api/documents/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if document belongs to the user
      if (document.userId !== req.session?.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteDocument(documentId);
      
      return res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== AI Chat Endpoints =====
  
  // Start or continue chat session
  app.post('/api/chat', authenticate, async (req: Request, res: Response) => {
    try {
      const { message, sessionId, subject } = req.body;
      const userId = req.session?.userId;
      
      // Validate message format
      const validatedMessage = chatMessageSchema.parse({
        role: "user",
        content: message
      });
      
      let chatHistory;
      
      if (sessionId) {
        // Get existing chat session
        chatHistory = await storage.getChatHistoryById(parseInt(sessionId));
        
        if (!chatHistory) {
          return res.status(404).json({ message: "Chat session not found" });
        }
        
        // Check if chat belongs to the user
        if (chatHistory.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        // Update existing chat with new message
        chatHistory = await storage.updateChatHistory(parseInt(sessionId), validatedMessage);
      } else {
        // Create new chat session
        chatHistory = await storage.createChatHistory({
          userId,
          sessionId: Date.now().toString(),
          messages: [validatedMessage],
          subject: subject || null
        });
      }
      
      // Get all previous messages to provide context
      const messages = chatHistory ? (Array.isArray(chatHistory.messages) 
        ? chatHistory.messages 
        : JSON.parse((chatHistory.messages as string) || '[]')) : [];
      
      // Prepare messages for OpenAI
      const apiMessages = messages.map((msg: any) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      }));
      
      // Add system message at the beginning for better context
      if (apiMessages.length <= 1) {
        apiMessages.unshift({
          role: "system",
          content: "You are Jadoo, an AI study assistant that helps students learn effectively. " +
            "You're knowledgeable across multiple subjects and can explain complex topics in simple terms. " +
            "Always be encouraging, helpful, and focus on explaining concepts clearly. " +
            `${subject ? `This conversation is about ${subject}.` : ""}`
        });
      }
      
      // Import and use the OpenAI service
      const { aiService } = await import('./services/openai');
      let aiResponseContent: string;
      
      try {
        aiResponseContent = await aiService.generateChatResponse(apiMessages);
      } catch (error) {
        console.error("Error generating AI response:", error);
        aiResponseContent = "I'm sorry, I encountered an error processing your request. Please try again.";
      }
      
      const aiResponse = {
        role: "assistant",
        content: aiResponseContent,
        timestamp: new Date()
      };
      
      // Add AI response to chat history
      if (chatHistory) {
        chatHistory = await storage.updateChatHistory(chatHistory.id, {
          role: "assistant" as "user" | "assistant" | "system",
          content: aiResponseContent,
          timestamp: new Date()
        });
      }
      
      return res.status(200).json({
        message: "Chat message processed",
        response: aiResponse,
        chatHistory
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get user's chat history
  app.get('/api/chat/history', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      const history = await storage.getChatHistoriesByUserId(userId);
      
      return res.status(200).json({ history });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== Flashcard Endpoints =====
  
  // Create flashcard
  app.post('/api/flashcards', authenticate, async (req: Request, res: Response) => {
    try {
      const flashcardData = insertFlashcardSchema.parse(req.body);
      const userId = req.session?.userId;
      
      // If document ID is provided, check if document exists and belongs to user
      if (flashcardData.documentId) {
        const document = await storage.getDocumentById(flashcardData.documentId);
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied to the document" });
        }
      }
      
      const flashcard = await storage.createFlashcard({
        ...flashcardData,
        userId
      });
      
      return res.status(201).json({
        message: "Flashcard created successfully",
        flashcard
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get flashcards by document ID or all user flashcards
  app.get('/api/flashcards', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      const documentId = req.query.documentId ? parseInt(req.query.documentId as string) : null;
      
      let flashcards;
      
      if (documentId) {
        // Check if document belongs to user
        const document = await storage.getDocumentById(documentId);
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied to the document" });
        }
        
        flashcards = await storage.getFlashcardsByDocumentId(documentId);
      } else {
        flashcards = await storage.getFlashcardsByUserId(userId);
      }
      
      return res.status(200).json({ flashcards });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== MCQ Endpoints =====
  
  // Create MCQ
  app.post('/api/mcqs', authenticate, async (req: Request, res: Response) => {
    try {
      const mcqData = insertMcqSchema.parse(req.body);
      const userId = req.session?.userId;
      
      // If document ID is provided, check if document exists and belongs to user
      if (mcqData.documentId) {
        const document = await storage.getDocumentById(mcqData.documentId);
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied to the document" });
        }
      }
      
      const mcq = await storage.createMcq({
        ...mcqData,
        userId
      });
      
      return res.status(201).json({
        message: "MCQ created successfully",
        mcq
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get MCQs by document ID, difficulty, or all user MCQs
  app.get('/api/mcqs', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      const documentId = req.query.documentId ? parseInt(req.query.documentId as string) : null;
      const difficulty = req.query.difficulty as string | null;
      
      let mcqs;
      
      if (documentId) {
        // Check if document belongs to user
        const document = await storage.getDocumentById(documentId);
        
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }
        
        if (document.userId !== userId) {
          return res.status(403).json({ message: "Access denied to the document" });
        }
        
        mcqs = await storage.getMcqsByDocumentId(documentId);
      } else if (difficulty) {
        mcqs = await storage.getMcqsByDifficulty(userId, difficulty);
      } else {
        mcqs = await storage.getMcqsByUserId(userId);
      }
      
      return res.status(200).json({ mcqs });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== Code Generator Endpoints =====
  
  // Generate code
  app.post('/api/code-generator', authenticate, async (req: Request, res: Response) => {
    try {
      const codeData = codeGenerationSchema.parse(req.body);
      const userId = req.session?.userId;
      
      // Import and use the OpenAI service
      const { aiService } = await import('./services/openai');
      
      // Generate code using the OpenAI service
      let codeResponse;
      try {
        codeResponse = await aiService.generateCode(
          codeData.problem,
          codeData.language,
          codeData.context
        );
      } catch (error) {
        console.error("Error generating code:", error);
        codeResponse = {
          code: `// Error generating code for ${codeData.language}\n// Please try again later`,
          explanation: "There was an error generating the code. Please try a different problem or language."
        };
      }
      
      const generatedCode = {
        title: `Solution for: ${codeData.problem.substring(0, 30)}...`,
        problem: codeData.problem,
        code: codeResponse.code,
        language: codeData.language,
        explanation: codeResponse.explanation
      };
      
      // Save the generated code
      const codeSnippet = await storage.createCodeSnippet({
        ...generatedCode,
        userId
      });
      
      // Update user stats
      const userStats = await storage.getUserStats(userId);
      if (userStats) {
        await storage.updateUserStats(userId, {
          codeSnippetsGenerated: userStats.codeSnippetsGenerated + 1
        });
      }
      
      return res.status(200).json({
        message: "Code generated successfully",
        codeSnippet
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get user's code snippets
  app.get('/api/code-snippets', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      const snippets = await storage.getCodeSnippetsByUserId(userId);
      
      return res.status(200).json({ snippets });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== Study Plan Endpoints =====
  
  // Create study plan
  app.post('/api/study-plans', authenticate, async (req: Request, res: Response) => {
    try {
      const planData = insertStudyPlanSchema.parse(req.body);
      const userId = req.session?.userId;
      
      const plan = await storage.createStudyPlan({
        ...planData,
        userId
      });
      
      return res.status(201).json({
        message: "Study plan created successfully",
        plan
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Get user's study plans
  app.get('/api/study-plans', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      const plans = await storage.getStudyPlansByUserId(userId);
      
      return res.status(200).json({ plans });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // Update study plan
  app.patch('/api/study-plans/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const plan = await storage.getStudyPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Study plan not found" });
      }
      
      // Check if plan belongs to the user
      if (plan.userId !== req.session?.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedPlan = await storage.updateStudyPlan(planId, req.body);
      
      return res.status(200).json({
        message: "Study plan updated successfully",
        plan: updatedPlan
      });
    } catch (error) {
      return handleApiError(error, res);
    }
  });
  
  // ===== User Stats Endpoints =====
  
  // Get user stats
  app.get('/api/user-stats', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      let stats = await storage.getUserStats(userId);
      
      if (!stats) {
        stats = await storage.updateUserStats(userId, {});
      }
      
      return res.status(200).json({ stats });
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
