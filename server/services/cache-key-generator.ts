/**
 * Cache Key Generator
 * 
 * Generates deterministic cache keys for quiz configurations.
 * Keys are based ONLY on: category, topic, difficulty, questionTypes, and questionCount.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import type { QuestionType } from "../../shared/quiz-types";

/**
 * Parameters for cache key generation
 */
export interface CacheKeyParams {
  category: string;
  topic: string;
  difficulty: string;
  questionTypes: QuestionType[];
  questionCount: number;
}

/**
 * Cache Key Generator class
 * 
 * Generates deterministic cache keys from quiz configuration parameters.
 * The same configuration will always produce the same key.
 */
export class CacheKeyGenerator {
  /**
   * Generate a deterministic cache key from quiz parameters
   * 
   * Key format: "quiz:{category}:{topic}:{difficulty}:{sortedTypes}:{count}"
   * 
   * Rules:
   * - All string values are lowercased and trimmed
   * - Question types are sorted alphabetically before joining
   * - Special characters in category/topic are URL-encoded
   * - No timestamps, user IDs, or random values included
   * 
   * @param params - The quiz configuration parameters
   * @returns A deterministic cache key string
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  generate(params: CacheKeyParams): string {
    // Normalize strings: lowercase and trim
    const normalizedCategory = this.normalizeString(params.category);
    const normalizedTopic = this.normalizeString(params.topic);
    const normalizedDifficulty = this.normalizeString(params.difficulty);
    
    // Sort and normalize question types
    const sortedTypes = this.normalizeTypes(params.questionTypes);
    
    // Build the cache key
    return `quiz:${normalizedCategory}:${normalizedTopic}:${normalizedDifficulty}:${sortedTypes}:${params.questionCount}`;
  }

  /**
   * Normalize a string value for cache key generation
   * 
   * - Trims whitespace
   * - Converts to lowercase
   * - URL-encodes special characters
   * 
   * @param value - The string to normalize
   * @returns The normalized string
   */
  private normalizeString(value: string): string {
    const trimmed = value.trim().toLowerCase();
    return encodeURIComponent(trimmed);
  }

  /**
   * Normalize and sort question types for consistent key generation
   * 
   * - Sorts types alphabetically
   * - Joins with comma separator
   * 
   * @param types - Array of question types
   * @returns Sorted, comma-separated string of types
   * 
   * Requirement: 1.4
   */
  private normalizeTypes(types: QuestionType[]): string {
    // Create a copy to avoid mutating the original array
    const sortedTypes = [...types].sort();
    return sortedTypes.join(',');
  }
}

// Export singleton instance
export const cacheKeyGenerator = new CacheKeyGenerator();
