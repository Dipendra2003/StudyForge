/**
 * Summary Enhancement Utilities
 * Provides functions to enhance summary visualization with additional metadata
 */

/**
 * Calculate reading time estimate
 * @param text - Text to calculate reading time for
 * @param wordsPerMinute - Average reading speed (default: 200 wpm)
 * @returns Reading time in minutes
 */
export function calculateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return Math.max(1, minutes); // Minimum 1 minute
}

/**
 * Determine text difficulty level based on various metrics
 * @param text - Text to analyze
 * @returns Difficulty level (easy, medium, hard)
 */
export function calculateDifficultyLevel(text: string): 'easy' | 'medium' | 'hard' {
  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (words.length === 0 || sentences.length === 0) {
    return 'easy';
  }
  
  // Calculate average word length
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  
  // Calculate average sentence length
  const avgSentenceLength = words.length / sentences.length;
  
  // Count complex words (more than 3 syllables or 7+ characters)
  const complexWords = words.filter(word => word.length >= 7).length;
  const complexWordRatio = complexWords / words.length;
  
  // Scoring system
  let difficultyScore = 0;
  
  // Average word length scoring
  if (avgWordLength > 6) difficultyScore += 2;
  else if (avgWordLength > 5) difficultyScore += 1;
  
  // Average sentence length scoring
  if (avgSentenceLength > 25) difficultyScore += 2;
  else if (avgSentenceLength > 18) difficultyScore += 1;
  
  // Complex word ratio scoring
  if (complexWordRatio > 0.2) difficultyScore += 2;
  else if (complexWordRatio > 0.1) difficultyScore += 1;
  
  // Determine difficulty level
  if (difficultyScore >= 4) return 'hard';
  if (difficultyScore >= 2) return 'medium';
  return 'easy';
}

/**
 * Extract and rank keywords from text
 * @param text - Text to extract keywords from
 * @param limit - Maximum number of keywords (default: 10)
 * @returns Array of keywords with scores
 */
export function extractKeywordsWithScores(text: string, limit: number = 10): Array<{ word: string; score: number }> {
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  
  // Common words to exclude
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i',
    'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when',
    'where', 'why', 'how', 'please', 'thank', 'thanks', 'hello', 'hi', 'yes',
    'no', 'also', 'just', 'very', 'more', 'most', 'some', 'such', 'into',
    'than', 'them', 'then', 'there', 'their', 'about', 'after', 'before',
    'between', 'through', 'during', 'without', 'within', 'because', 'however',
    'therefore', 'thus', 'hence', 'moreover', 'furthermore', 'additionally'
  ]);
  
  // Count word frequency
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    if (!stopWords.has(word) && word.length >= 4) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  });
  
  // Calculate TF (Term Frequency) scores
  const maxFreq = Math.max(...Array.from(wordFreq.values()));
  const keywordsWithScores = Array.from(wordFreq.entries())
    .map(([word, freq]) => ({
      word,
      score: freq / maxFreq, // Normalized score
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return keywordsWithScores;
}

/**
 * Highlight keywords in text
 * @param text - Text to highlight keywords in
 * @param keywords - Array of keywords to highlight
 * @returns Text with HTML highlighting
 */
export function highlightKeywords(text: string, keywords: string[]): string {
  if (!keywords || keywords.length === 0) return text;
  
  let highlightedText = text;
  
  // Sort keywords by length (longest first) to avoid partial matches
  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
  
  sortedKeywords.forEach(keyword => {
    // Create case-insensitive regex with word boundaries
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
    highlightedText = highlightedText.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">$1</mark>'
    );
  });
  
  return highlightedText;
}

/**
 * Generate summary metadata
 * @param originalText - Original document text
 * @param summary - Generated summary text
 * @param keywords - Extracted keywords
 * @returns Metadata object
 */
export function generateSummaryMetadata(
  originalText: string,
  summary: string,
  keywords: string[]
): {
  readingTime: number;
  originalReadingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  compressionRatio: number;
  wordCount: number;
  originalWordCount: number;
  keywordDensity: number;
} {
  const readingTime = calculateReadingTime(summary);
  const originalReadingTime = calculateReadingTime(originalText);
  const difficulty = calculateDifficultyLevel(summary);
  
  const summaryWords = summary.trim().split(/\s+/).length;
  const originalWords = originalText.trim().split(/\s+/).length;
  const compressionRatio = originalWords > 0 ? Math.round((summaryWords / originalWords) * 100) : 0;
  
  // Calculate keyword density (percentage of text that is keywords)
  const keywordOccurrences = keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = summary.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
  const keywordDensity = summaryWords > 0 ? Math.round((keywordOccurrences / summaryWords) * 100) : 0;
  
  return {
    readingTime,
    originalReadingTime,
    difficulty,
    compressionRatio,
    wordCount: summaryWords,
    originalWordCount: originalWords,
    keywordDensity,
  };
}

/**
 * Format reading time for display
 * @param minutes - Reading time in minutes
 * @returns Formatted string
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than 1 min';
  if (minutes === 1) return '1 min';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}
