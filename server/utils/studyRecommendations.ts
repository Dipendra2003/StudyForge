/**
 * Study Recommendations Engine
 * Analyzes user performance data and generates personalized study recommendations
 */

export interface UserPerformanceData {
  quizzesCompleted: number;
  averageScore: number;
  flashcardsReviewed: number;
  correctFlashcards: number;
  incorrectFlashcards: number;
  totalStudyTime: number;
  streakDays: number;
  documentsUploaded: number;
}

export interface QuizPerformance {
  category?: string;
  difficulty: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  createdAt: Date;
}

export interface StudyRecommendation {
  type: 'topic' | 'difficulty' | 'time' | 'streak' | 'review';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  icon?: string;
}

/**
 * Analyze quiz performance to identify weak topics
 * @param quizAttempts - Array of quiz attempts
 * @returns Topics that need review
 */
export function analyzeWeakTopics(quizAttempts: QuizPerformance[]): string[] {
  if (quizAttempts.length === 0) return [];
  
  // Group by category and calculate average scores
  const categoryScores = new Map<string, { total: number; count: number }>();
  
  quizAttempts.forEach(attempt => {
    const category = attempt.category || 'General';
    const existing = categoryScores.get(category) || { total: 0, count: 0 };
    categoryScores.set(category, {
      total: existing.total + attempt.score,
      count: existing.count + 1,
    });
  });
  
  // Find categories with average score below 70%
  const weakTopics: string[] = [];
  categoryScores.forEach((data, category) => {
    const avgScore = data.total / data.count;
    if (avgScore < 70) {
      weakTopics.push(category);
    }
  });
  
  return weakTopics;
}

/**
 * Determine optimal difficulty level based on recent performance
 * @param quizAttempts - Recent quiz attempts
 * @returns Recommended difficulty level
 */
export function recommendDifficulty(quizAttempts: QuizPerformance[]): 'easy' | 'medium' | 'hard' {
  if (quizAttempts.length === 0) return 'medium';
  
  // Get last 5 attempts
  const recentAttempts = quizAttempts.slice(-5);
  const avgScore = recentAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / recentAttempts.length;
  
  // Recommend based on average score
  if (avgScore >= 85) return 'hard';
  if (avgScore >= 70) return 'medium';
  return 'easy';
}

/**
 * Calculate flashcard review accuracy
 * @param correctFlashcards - Number of correct reviews
 * @param incorrectFlashcards - Number of incorrect reviews
 * @returns Accuracy percentage
 */
export function calculateFlashcardAccuracy(correctFlashcards: number, incorrectFlashcards: number): number {
  const total = correctFlashcards + incorrectFlashcards;
  if (total === 0) return 0;
  return Math.round((correctFlashcards / total) * 100);
}

/**
 * Generate personalized study recommendations
 * @param userData - User performance data
 * @param quizAttempts - Recent quiz attempts
 * @returns Array of study recommendations
 */
export function generateRecommendations(
  userData: UserPerformanceData,
  quizAttempts: QuizPerformance[]
): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = [];
  
  // 1. Streak recommendations
  if (userData.streakDays === 0) {
    recommendations.push({
      type: 'streak',
      priority: 'high',
      title: 'Start Your Study Streak',
      description: 'Begin building a daily study habit. Even 10 minutes a day makes a difference!',
      action: 'Review flashcards or take a quick quiz',
      icon: 'flame',
    });
  } else if (userData.streakDays >= 7) {
    recommendations.push({
      type: 'streak',
      priority: 'low',
      title: `Amazing ${userData.streakDays}-Day Streak!`,
      description: 'Keep up the excellent work! Consistency is key to mastering any subject.',
      icon: 'trophy',
    });
  }
  
  // 2. Weak topic recommendations
  const weakTopics = analyzeWeakTopics(quizAttempts);
  if (weakTopics.length > 0) {
    recommendations.push({
      type: 'topic',
      priority: 'high',
      title: 'Topics Needing Review',
      description: `Focus on: ${weakTopics.join(', ')}. Your scores in these areas could use improvement.`,
      action: 'Create flashcards or take practice quizzes',
      icon: 'target',
    });
  }
  
  // 3. Difficulty recommendations
  if (quizAttempts.length >= 3) {
    const recommendedDifficulty = recommendDifficulty(quizAttempts);
    const recentAvg = quizAttempts.slice(-5).reduce((sum, a) => sum + a.score, 0) / Math.min(5, quizAttempts.length);
    
    if (recentAvg >= 85 && recommendedDifficulty === 'hard') {
      recommendations.push({
        type: 'difficulty',
        priority: 'medium',
        title: 'Challenge Yourself',
        description: 'Your recent scores are excellent! Try harder difficulty questions to push your limits.',
        action: 'Take a hard difficulty quiz',
        icon: 'zap',
      });
    } else if (recentAvg < 60) {
      recommendations.push({
        type: 'difficulty',
        priority: 'medium',
        title: 'Build Your Foundation',
        description: 'Focus on easier questions to strengthen your understanding of core concepts.',
        action: 'Practice with easy difficulty quizzes',
        icon: 'book',
      });
    }
  }
  
  // 4. Flashcard review recommendations
  if (userData.flashcardsReviewed > 0) {
    const accuracy = calculateFlashcardAccuracy(userData.correctFlashcards, userData.incorrectFlashcards);
    
    if (accuracy < 70) {
      recommendations.push({
        type: 'review',
        priority: 'high',
        title: 'Increase Review Frequency',
        description: `Your flashcard accuracy is ${accuracy}%. More frequent reviews will help improve retention.`,
        action: 'Review due flashcards',
        icon: 'refresh',
      });
    } else if (accuracy >= 90) {
      recommendations.push({
        type: 'review',
        priority: 'low',
        title: 'Excellent Retention!',
        description: `${accuracy}% accuracy on flashcards. You're mastering the material!`,
        icon: 'check-circle',
      });
    }
  }
  
  // 5. Study time recommendations
  const avgDailyStudyTime = userData.streakDays > 0 
    ? userData.totalStudyTime / userData.streakDays 
    : 0;
  
  if (avgDailyStudyTime < 15 && userData.streakDays > 0) {
    recommendations.push({
      type: 'time',
      priority: 'medium',
      title: 'Increase Study Duration',
      description: 'Try to study for at least 20-30 minutes per day for better results.',
      action: 'Set a daily study goal',
      icon: 'clock',
    });
  } else if (avgDailyStudyTime >= 60) {
    recommendations.push({
      type: 'time',
      priority: 'low',
      title: 'Great Study Habits!',
      description: `You're averaging ${Math.round(avgDailyStudyTime)} minutes per day. Excellent dedication!`,
      icon: 'trending-up',
    });
  }
  
  // 6. Content creation recommendations
  if (userData.documentsUploaded === 0 && userData.quizzesCompleted > 5) {
    recommendations.push({
      type: 'topic',
      priority: 'medium',
      title: 'Upload Study Materials',
      description: 'Upload your notes or textbooks to get AI-powered summaries and generate custom flashcards.',
      action: 'Upload a document',
      icon: 'upload',
    });
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return recommendations;
}

/**
 * Generate study plan adjustments based on performance
 * @param userData - User performance data
 * @param quizAttempts - Recent quiz attempts
 * @returns Suggested adjustments
 */
export function suggestStudyPlanAdjustments(
  userData: UserPerformanceData,
  quizAttempts: QuizPerformance[]
): {
  increaseTime: boolean;
  focusAreas: string[];
  recommendedDifficulty: string;
  reviewFrequency: string;
} {
  const weakTopics = analyzeWeakTopics(quizAttempts);
  const recommendedDiff = recommendDifficulty(quizAttempts);
  const flashcardAccuracy = calculateFlashcardAccuracy(
    userData.correctFlashcards,
    userData.incorrectFlashcards
  );
  
  return {
    increaseTime: userData.totalStudyTime < 300, // Less than 5 hours total
    focusAreas: weakTopics,
    recommendedDifficulty: recommendedDiff,
    reviewFrequency: flashcardAccuracy < 70 ? 'daily' : flashcardAccuracy >= 90 ? 'every 3 days' : 'every 2 days',
  };
}
