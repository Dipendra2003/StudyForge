import { db } from "../db";
import { shareableQuizLinks, sharedQuizAttempts, quizAttempts, users } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { Logger, LogCategory } from "../utils/logger";
import { nanoid } from "nanoid";

/**
 * Service for managing shareable quiz links
 * Implements Requirements 23.1, 23.2, 23.3, 23.4, 23.5
 */
export class ShareableQuizService {
  /**
   * Generate a unique shareable link for a completed quiz
   * Property 77: Shareable link uniqueness
   * 
   * @param userId - User who completed the quiz
   * @param quizAttemptId - ID of the completed quiz attempt
   * @param expiresInDays - Optional expiration in days (default: 30)
   * @returns Shareable link object with linkId
   */
  async generateShareableLink(
    userId: number,
    quizAttemptId: number,
    expiresInDays: number = 30
  ): Promise<{
    linkId: string;
    shareUrl: string;
    expiresAt: Date | null;
  }> {
    try {
      // Get the quiz attempt details
      const [attempt] = await db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.id, quizAttemptId),
            eq(quizAttempts.userId, userId)
          )
        )
        .limit(1);

      if (!attempt) {
        throw new Error("Quiz attempt not found or unauthorized");
      }

      if (!attempt.completed) {
        throw new Error("Cannot share an incomplete quiz");
      }

      // Generate unique link ID
      const linkId = nanoid(12); // 12 character unique ID

      // Calculate expiration date
      const expiresAt = expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Create shareable link record
      const [shareableLink] = await db
        .insert(shareableQuizLinks)
        .values({
          linkId,
          creatorUserId: userId,
          quizAttemptId,
          category: attempt.category || "General",
          difficulty: attempt.difficulty || "medium",
          questionsData: attempt.questionsData,
          totalQuestions: attempt.totalQuestions,
          expiresAt,
          isActive: true,
          viewCount: 0,
        })
        .$returningId();

      Logger.info(LogCategory.QUIZ, "Generated shareable quiz link", {
        userId,
        quizAttemptId,
        linkId,
        expiresAt,
      });

      return {
        linkId,
        shareUrl: `/quiz/shared/${linkId}`,
        expiresAt,
      };
    } catch (error) {
      Logger.error(LogCategory.QUIZ, "Error generating shareable link", error as Error);
      throw error;
    }
  }

  /**
   * Validate and retrieve a shareable quiz link
   * Property 80: Shareable link validation
   * 
   * @param linkId - The unique link identifier
   * @returns Shareable link details if valid
   */
  async validateAndGetLink(linkId: string): Promise<{
    id: number;
    linkId: string;
    creatorUserId: number;
    creatorUsername: string;
    category: string;
    difficulty: string;
    questionsData: any;
    totalQuestions: number;
    createdAt: Date;
    creatorScore: number;
    creatorTimeSpent: number;
  } | null> {
    try {
      // Get the shareable link with creator details
      const [link] = await db
        .select({
          id: shareableQuizLinks.id,
          linkId: shareableQuizLinks.linkId,
          creatorUserId: shareableQuizLinks.creatorUserId,
          creatorUsername: users.username,
          category: shareableQuizLinks.category,
          difficulty: shareableQuizLinks.difficulty,
          questionsData: shareableQuizLinks.questionsData,
          totalQuestions: shareableQuizLinks.totalQuestions,
          expiresAt: shareableQuizLinks.expiresAt,
          isActive: shareableQuizLinks.isActive,
          viewCount: shareableQuizLinks.viewCount,
          createdAt: shareableQuizLinks.createdAt,
          quizAttemptId: shareableQuizLinks.quizAttemptId,
        })
        .from(shareableQuizLinks)
        .innerJoin(users, eq(shareableQuizLinks.creatorUserId, users.id))
        .where(eq(shareableQuizLinks.linkId, linkId))
        .limit(1);

      if (!link) {
        Logger.warn(LogCategory.QUIZ, "Shareable link not found", { linkId });
        return null;
      }

      // Check if link is active
      if (!link.isActive) {
        Logger.warn(LogCategory.QUIZ, "Shareable link is inactive", { linkId });
        return null;
      }

      // Check if link has expired
      if (link.expiresAt && new Date() > link.expiresAt) {
        Logger.warn(LogCategory.QUIZ, "Shareable link has expired", { linkId, expiresAt: link.expiresAt });
        return null;
      }

      // Get creator's quiz attempt details
      const [creatorAttempt] = await db
        .select({
          score: quizAttempts.score,
          timeSpent: quizAttempts.timeSpent,
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.id, link.quizAttemptId))
        .limit(1);

      // Increment view count
      await db
        .update(shareableQuizLinks)
        .set({ viewCount: link.viewCount + 1 })
        .where(eq(shareableQuizLinks.id, link.id));

      Logger.info(LogCategory.QUIZ, "Validated shareable link", { linkId });

      return {
        id: link.id,
        linkId: link.linkId,
        creatorUserId: link.creatorUserId,
        creatorUsername: link.creatorUsername,
        category: link.category,
        difficulty: link.difficulty,
        questionsData: link.questionsData,
        totalQuestions: link.totalQuestions,
        createdAt: link.createdAt,
        creatorScore: creatorAttempt?.score || 0,
        creatorTimeSpent: creatorAttempt?.timeSpent || 0,
      };
    } catch (error) {
      Logger.error(LogCategory.QUIZ, "Error validating shareable link", error as Error);
      throw error;
    }
  }

  /**
   * Record a user's attempt on a shared quiz
   * Property 78: Shared quiz accessibility
   * 
   * @param linkId - The shareable link ID
   * @param userId - User taking the shared quiz
   * @param quizAttemptId - ID of the user's quiz attempt
   * @returns Shared quiz attempt record
   */
  async recordSharedQuizAttempt(
    linkId: string,
    userId: number,
    quizAttemptId: number
  ): Promise<void> {
    try {
      // Get the shareable link
      const [link] = await db
        .select()
        .from(shareableQuizLinks)
        .where(eq(shareableQuizLinks.linkId, linkId))
        .limit(1);

      if (!link) {
        throw new Error("Shareable link not found");
      }

      // Get the quiz attempt details
      const [attempt] = await db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.id, quizAttemptId),
            eq(quizAttempts.userId, userId)
          )
        )
        .limit(1);

      if (!attempt) {
        throw new Error("Quiz attempt not found");
      }

      // Check if user already took this shared quiz
      const [existing] = await db
        .select()
        .from(sharedQuizAttempts)
        .where(
          and(
            eq(sharedQuizAttempts.shareableLinkId, link.id),
            eq(sharedQuizAttempts.userId, userId)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing attempt
        await db
          .update(sharedQuizAttempts)
          .set({
            quizAttemptId,
            score: attempt.score,
            totalQuestions: attempt.totalQuestions,
            correctAnswers: attempt.correctAnswers,
            timeSpent: attempt.timeSpent || 0,
            accuracy: Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100),
            completedAt: new Date(),
          })
          .where(eq(sharedQuizAttempts.id, existing.id));
      } else {
        // Create new shared quiz attempt
        await db.insert(sharedQuizAttempts).values({
          shareableLinkId: link.id,
          userId,
          quizAttemptId,
          score: attempt.score,
          totalQuestions: attempt.totalQuestions,
          correctAnswers: attempt.correctAnswers,
          timeSpent: attempt.timeSpent || 0,
          accuracy: Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100),
        });
      }

      Logger.info(LogCategory.QUIZ, "Recorded shared quiz attempt", {
        linkId,
        userId,
        quizAttemptId,
      });
    } catch (error) {
      Logger.error(LogCategory.QUIZ, "Error recording shared quiz attempt", error as Error);
      throw error;
    }
  }

  /**
   * Get all attempts for a shared quiz with score comparison
   * Property 79: Shared quiz score comparison
   * 
   * @param linkId - The shareable link ID
   * @returns Array of all attempts with user details and rankings
   */
  async getSharedQuizComparison(linkId: string): Promise<{
    creator: {
      userId: number;
      username: string;
      score: number;
      accuracy: number;
      timeSpent: number;
      rank: number;
    };
    participants: Array<{
      userId: number;
      username: string;
      score: number;
      accuracy: number;
      timeSpent: number;
      completedAt: Date;
      rank: number;
    }>;
    totalParticipants: number;
  }> {
    try {
      // Get the shareable link with creator info
      const linkData = await this.validateAndGetLink(linkId);

      if (!linkData) {
        throw new Error("Invalid or expired shareable link");
      }

      // Get all shared quiz attempts
      const attempts = await db
        .select({
          userId: sharedQuizAttempts.userId,
          username: users.username,
          score: sharedQuizAttempts.score,
          accuracy: sharedQuizAttempts.accuracy,
          timeSpent: sharedQuizAttempts.timeSpent,
          completedAt: sharedQuizAttempts.completedAt,
        })
        .from(sharedQuizAttempts)
        .innerJoin(users, eq(sharedQuizAttempts.userId, users.id))
        .where(eq(sharedQuizAttempts.shareableLinkId, linkData.id))
        .orderBy(desc(sharedQuizAttempts.score), sharedQuizAttempts.timeSpent);

      // Create creator entry
      const creatorAccuracy = Math.round(
        (linkData.creatorScore / linkData.totalQuestions) * 100
      );

      // Combine all scores for ranking
      const allScores: Array<{
        userId: number;
        username: string;
        score: number;
        accuracy: number;
        timeSpent: number;
        completedAt?: Date;
        isCreator: boolean;
        rank?: number;
      }> = [
        {
          userId: linkData.creatorUserId,
          username: linkData.creatorUsername,
          score: linkData.creatorScore,
          accuracy: creatorAccuracy,
          timeSpent: linkData.creatorTimeSpent,
          isCreator: true,
        },
        ...attempts.map((a: {
          userId: number;
          username: string;
          score: number;
          accuracy: number;
          timeSpent: number;
          completedAt: Date;
        }) => ({
          userId: a.userId,
          username: a.username,
          score: a.score,
          accuracy: a.accuracy,
          timeSpent: a.timeSpent,
          completedAt: a.completedAt,
          isCreator: false,
        })),
      ];

      // Sort by score (desc) then by time (asc)
      allScores.sort((a: typeof allScores[0], b: typeof allScores[0]) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.timeSpent - b.timeSpent;
      });

      // Assign ranks
      let currentRank = 1;
      allScores.forEach((entry, index) => {
        if (index > 0) {
          const prev = allScores[index - 1];
          if (entry.score !== prev.score || entry.timeSpent !== prev.timeSpent) {
            currentRank = index + 1;
          }
        }
        (entry as any).rank = currentRank;
      });

      // Separate creator and participants
      const creator = allScores.find((s) => s.isCreator);
      const participants = allScores
        .filter((s) => !s.isCreator)
        .map((p) => ({
          userId: p.userId,
          username: p.username,
          score: p.score,
          accuracy: p.accuracy,
          timeSpent: p.timeSpent,
          completedAt: (p as any).completedAt,
          rank: (p as any).rank,
        }));

      Logger.info(LogCategory.QUIZ, "Retrieved shared quiz comparison", {
        linkId,
        totalParticipants: participants.length,
      });

      return {
        creator: {
          userId: creator!.userId,
          username: creator!.username,
          score: creator!.score,
          accuracy: creator!.accuracy,
          timeSpent: creator!.timeSpent,
          rank: (creator as any).rank,
        },
        participants,
        totalParticipants: participants.length,
      };
    } catch (error) {
      Logger.error(LogCategory.QUIZ, "Error getting shared quiz comparison", error as Error);
      throw error;
    }
  }

  /**
   * Deactivate a shareable link
   * 
   * @param linkId - The shareable link ID
   * @param userId - User requesting deactivation (must be creator)
   */
  async deactivateLink(linkId: string, userId: number): Promise<void> {
    try {
      const [link] = await db
        .select()
        .from(shareableQuizLinks)
        .where(eq(shareableQuizLinks.linkId, linkId))
        .limit(1);

      if (!link) {
        throw new Error("Shareable link not found");
      }

      if (link.creatorUserId !== userId) {
        throw new Error("Unauthorized: Only the creator can deactivate this link");
      }

      await db
        .update(shareableQuizLinks)
        .set({ isActive: false })
        .where(eq(shareableQuizLinks.id, link.id));

      Logger.info(LogCategory.QUIZ, "Deactivated shareable link", { linkId, userId });
    } catch (error) {
      Logger.error(LogCategory.QUIZ, "Error deactivating shareable link", error as Error);
      throw error;
    }
  }

  /**
   * Get all shareable links created by a user
   * 
   * @param userId - User ID
   * @returns Array of shareable links with stats
   */
  async getUserShareableLinks(userId: number): Promise<
    Array<{
      linkId: string;
      category: string;
      difficulty: string;
      totalQuestions: number;
      viewCount: number;
      participantCount: number;
      createdAt: Date;
      expiresAt: Date | null;
      isActive: boolean;
    }>
  > {
    try {
      const links = await db
        .select({
          id: shareableQuizLinks.id,
          linkId: shareableQuizLinks.linkId,
          category: shareableQuizLinks.category,
          difficulty: shareableQuizLinks.difficulty,
          totalQuestions: shareableQuizLinks.totalQuestions,
          viewCount: shareableQuizLinks.viewCount,
          createdAt: shareableQuizLinks.createdAt,
          expiresAt: shareableQuizLinks.expiresAt,
          isActive: shareableQuizLinks.isActive,
        })
        .from(shareableQuizLinks)
        .where(eq(shareableQuizLinks.creatorUserId, userId))
        .orderBy(desc(shareableQuizLinks.createdAt));

      // Get participant counts for each link
      const linksWithCounts = await Promise.all(
        links.map(async (link: {
          id: number;
          linkId: string;
          category: string;
          difficulty: string;
          totalQuestions: number;
          viewCount: number;
          createdAt: Date;
          expiresAt: Date | null;
          isActive: boolean;
        }) => {
          const [countResult] = await db
            .select({ count: sharedQuizAttempts.id })
            .from(sharedQuizAttempts)
            .where(eq(sharedQuizAttempts.shareableLinkId, link.id));

          return {
            linkId: link.linkId,
            category: link.category,
            difficulty: link.difficulty,
            totalQuestions: link.totalQuestions,
            viewCount: link.viewCount,
            participantCount: countResult?.count || 0,
            createdAt: link.createdAt,
            expiresAt: link.expiresAt,
            isActive: link.isActive,
          };
        })
      );

      return linksWithCounts;
    } catch (error) {
      Logger.error(LogCategory.QUIZ, "Error getting user shareable links", error as Error);
      throw error;
    }
  }
}

export const shareableQuizService = new ShareableQuizService();
