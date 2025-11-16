/**
 * SM-2 Spaced Repetition Algorithm Implementation
 * Based on the SuperMemo SM-2 algorithm for optimal learning intervals
 * 
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

export interface SM2Result {
  interval: number; // Days until next review
  easeFactor: number; // Ease factor (difficulty multiplier)
  repetitions: number; // Number of successful repetitions
}

export interface FlashcardReviewData {
  repetitionInterval: number;
  easeFactor: number;
  lastReviewed: Date | null;
  nextReviewDate: Date | null;
}

/**
 * Calculate next review parameters using SM-2 algorithm
 * @param quality - Quality of recall (0-5):
 *   0 - Complete blackout
 *   1 - Incorrect response, but correct one seemed familiar
 *   2 - Incorrect response, but correct one remembered
 *   3 - Correct response, but required significant difficulty
 *   4 - Correct response, after some hesitation
 *   5 - Perfect response
 * @param previousInterval - Previous interval in days
 * @param previousEaseFactor - Previous ease factor (stored as integer * 100, e.g., 250 = 2.5)
 * @param previousRepetitions - Number of previous successful repetitions
 * @returns SM2Result with new interval, ease factor, and repetition count
 */
export function calculateSM2(
  quality: number,
  previousInterval: number = 1,
  previousEaseFactor: number = 250, // 2.5 * 100
  previousRepetitions: number = 0
): SM2Result {
  // Convert ease factor from integer storage (250) to decimal (2.5)
  let easeFactor = previousEaseFactor / 100;
  
  // Ensure quality is within valid range
  quality = Math.max(0, Math.min(5, quality));
  
  // Calculate new ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Ensure ease factor doesn't go below 1.3
  easeFactor = Math.max(1.3, easeFactor);
  
  let interval: number;
  let repetitions: number;
  
  if (quality < 3) {
    // Incorrect response - reset repetitions and start over
    repetitions = 0;
    interval = 1;
  } else {
    // Correct response - calculate next interval
    repetitions = previousRepetitions + 1;
    
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(previousInterval * easeFactor);
    }
  }
  
  return {
    interval,
    easeFactor: Math.round(easeFactor * 100), // Convert back to integer storage
    repetitions,
  };
}

/**
 * Convert boolean correct/incorrect to SM-2 quality rating
 * @param correct - Whether the answer was correct
 * @param confidence - Optional confidence level (0-1)
 * @returns Quality rating (0-5)
 */
export function booleanToQuality(correct: boolean, confidence?: number): number {
  if (!correct) {
    return 0; // Complete failure
  }
  
  if (confidence !== undefined) {
    // Map confidence (0-1) to quality (3-5)
    return Math.round(3 + confidence * 2);
  }
  
  // Default to quality 4 (correct with some hesitation)
  return 4;
}

/**
 * Calculate the next review date based on interval
 * @param interval - Number of days until next review
 * @param baseDate - Base date to calculate from (defaults to now)
 * @returns Next review date
 */
export function calculateNextReviewDate(interval: number, baseDate: Date = new Date()): Date {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + interval);
  // Set to start of day for consistency
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

/**
 * Check if a flashcard is due for review
 * @param nextReviewDate - The scheduled next review date
 * @param currentDate - Current date (defaults to now)
 * @returns True if the card is due for review
 */
export function isCardDue(nextReviewDate: Date | null, currentDate: Date = new Date()): boolean {
  if (!nextReviewDate) {
    return true; // Never reviewed cards are always due
  }
  
  const now = new Date(currentDate);
  now.setHours(0, 0, 0, 0);
  
  const reviewDate = new Date(nextReviewDate);
  reviewDate.setHours(0, 0, 0, 0);
  
  return reviewDate <= now;
}

/**
 * Calculate review streak based on review history
 * @param lastReviewDate - Date of last review
 * @param currentDate - Current date (defaults to now)
 * @returns Number of consecutive days reviewed
 */
export function calculateStreak(lastReviewDate: Date | null, previousStreak: number = 0, currentDate: Date = new Date()): number {
  if (!lastReviewDate) {
    return 0;
  }
  
  const now = new Date(currentDate);
  now.setHours(0, 0, 0, 0);
  
  const lastReview = new Date(lastReviewDate);
  lastReview.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    // Reviewed today - maintain streak
    return previousStreak;
  } else if (daysDiff === 1) {
    // Reviewed yesterday - increment streak
    return previousStreak + 1;
  } else {
    // Streak broken - reset to 1 (today's review)
    return 1;
  }
}
