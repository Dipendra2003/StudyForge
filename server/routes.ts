import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWaitlistSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Waitlist API endpoint
  app.post('/api/waitlist', async (req: Request, res: Response) => {
    try {
      // Validate input
      const validatedData = insertWaitlistSchema.parse(req.body);
      
      // Check if email already exists
      const existingEntry = await storage.getWaitlistEntryByEmail(validatedData.email);
      if (existingEntry) {
        return res.status(409).json({ 
          message: "This email is already on our waitlist." 
        });
      }
      
      // Add to waitlist
      const entry = await storage.createWaitlistEntry(validatedData);
      
      // Return success response
      return res.status(201).json({
        message: "Successfully joined the waitlist",
        entry
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details
        });
      }
      
      console.error("Error adding to waitlist:", error);
      return res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  // Get waitlist stats (count only)
  app.get('/api/waitlist/stats', async (_req: Request, res: Response) => {
    try {
      const count = await storage.getWaitlistCount();
      return res.status(200).json({ count });
    } catch (error) {
      console.error("Error fetching waitlist stats:", error);
      return res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
