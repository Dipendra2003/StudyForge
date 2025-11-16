/**
 * Flashcard Analytics Utility
 * Calculates various analytics metrics for flashcard study sessions
 */

import type { Flashcard } from "@shared/schema";

export interface FlashcardAnalytics {
  reviewHistory: { date: string; count: number }[];
  accuracyByCategory: { category: string; accuracy: number; total: number }[];
  masteryLevels: { level: string; count: number }[];
  studyStreak: { current: number; longest: number };
  totalReviews: number;
  averageAccuracy: number;
}

/**
 * Calculate comprehensive flashcard analytics
 * @param flashcards - All flashcards for the user
 * @param userStats - User statistics object
 * @returns FlashcardAnalytics object with all metrics
 */
export function calculateFlashcardAnalytics(
  flashcards: Flashcard[],
  userStats: any
): FlashcardAnalytics {
  // Calculate review history (daily counts for past 90 days)
  const reviewHistory = calculateReviewHistory(flashcards);
  
  // Calculate accuracy by category
  const accuracyByCategory = calculateAccuracyByCategory(flashcards, userStats);
  
  // Calculate mastery levels
  const masteryLevels = calculateMasteryLevels(flashcards);
  
  // Calculate study streak
  const studyStreak = {
    current: userStats?.streakDays || 0,
    longest: userStats?.longestStreak || 0,
  };
  
  // Calculate total reviews and average accuracy
  const totalReviews = userStats?.flashcardsReviewed || 0;
  const correctReviews = userStats?.correctFlashcards || 0;
  const averageAccuracy = totalReviews > 0 
    ? Math.round((correctReviews / totalReviews) * 100) 
    : 0;
  
  return {
    reviewHistory,
    accuracyByCategory,
    masteryLevels,
    studyStreak,
    totalReviews,
    averageAccuracy,
  };
}

/**
 * Calculate review history for the past 90 days
 * @param flashcards - All flashcards for the user
 * @returns Array of daily review counts
 */
function calculateReviewHistory(flashcards: Flashcard[]): { date: string; count: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Create a map for the past 90 days
  const reviewMap = new Map<string, number>();
  
  // Initialize all days with 0 using local timezone
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    reviewMap.set(dateStr, 0);
  }
  
  // Count reviews for each day
  flashcards.forEach(card => {
    if (card.lastReviewed) {
      const reviewDate = new Date(card.lastReviewed);
      // Get date in local timezone, not UTC
      const year = reviewDate.getFullYear();
      const month = String(reviewDate.getMonth() + 1).padStart(2, '0');
      const day = String(reviewDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Only count if within the past 90 days
      if (reviewMap.has(dateStr)) {
        reviewMap.set(dateStr, (reviewMap.get(dateStr) || 0) + 1);
      }
    }
  });
  
  // Convert map to array
  return Array.from(reviewMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate accuracy by category
 * @param flashcards - All flashcards for the user
 * @param userStats - User statistics object
 * @returns Array of category accuracy metrics
 */
function calculateAccuracyByCategory(
  flashcards: Flashcard[],
  userStats: any
): { category: string; accuracy: number; total: number }[] {
  // Group flashcards by category
  const categoryMap = new Map<string, { total: number; reviewed: number }>();
  
  flashcards.forEach(card => {
    const category = card.category || 'Uncategorized';
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { total: 0, reviewed: 0 });
    }
    
    const stats = categoryMap.get(category)!;
    stats.total++;
    
    if (card.lastReviewed) {
      stats.reviewed++;
    }
  });
  
  // Calculate accuracy for each category
  // Note: We don't have per-card accuracy data, so we estimate based on ease factor
  const result: { category: string; accuracy: number; total: number }[] = [];
  
  categoryMap.forEach((stats, category) => {
    // Get cards in this category
    const categoryCards = flashcards.filter(c => (c.category || 'Uncategorized') === category);
    
    // Calculate average ease factor for reviewed cards
    const reviewedCards = categoryCards.filter(c => c.lastReviewed);
    
    if (reviewedCards.length > 0) {
      // Ease factor ranges from 130 to 250+
      // Map it to accuracy percentage (higher ease factor = better accuracy)
      const avgEaseFactor = reviewedCards.reduce((sum, c) => sum + (c.easeFactor || 250), 0) / reviewedCards.length;
      
      // Map ease factor (130-300) to accuracy (40-100)
      const accuracy = Math.min(100, Math.max(40, Math.round(((avgEaseFactor - 130) / 170) * 60 + 40)));
      
      result.push({
        category,
        accuracy,
        total: stats.reviewed,
      });
    } else {
      // No reviews yet
      result.push({
        category,
        accuracy: 0,
        total: 0,
      });
    }
  });
  
  return result.sort((a, b) => b.total - a.total);
}

/**
 * Calculate mastery levels distribution
 * @param flashcards - All flashcards for the user
 * @returns Array of mastery level counts
 */
function calculateMasteryLevels(flashcards: Flashcard[]): { level: string; count: number }[] {
  const levels = {
    learning: 0,
    reviewing: 0,
    mastered: 0,
  };
  
  flashcards.forEach(card => {
    // Determine mastery level based on ease factor and repetition interval
    const easeFactor = card.easeFactor || 250;
    const interval = card.repetitionInterval || 1;
    
    if (!card.lastReviewed || interval <= 1) {
      // New or failed cards
      levels.learning++;
    } else if (easeFactor >= 250 && interval >= 21) {
      // High ease factor and long interval = mastered
      levels.mastered++;
    } else {
      // In between = reviewing
      levels.reviewing++;
    }
  });
  
  return [
    { level: 'Learning', count: levels.learning },
    { level: 'Reviewing', count: levels.reviewing },
    { level: 'Mastered', count: levels.mastered },
  ];
}
