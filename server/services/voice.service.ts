import type { Question, QuestionType } from "../../shared/quiz-types";

/**
 * VoiceService - Server-side voice input validation and normalization
 * 
 * This service handles voice-related processing including answer validation
 * and text normalization for voice inputs.
 */
export class VoiceService {
  /**
   * Normalize voice input by removing extra whitespace, converting to lowercase,
   * and handling common speech-to-text variations
   * 
   * @param transcript - Raw voice input transcript
   * @returns Normalized text
   */
  normalizeVoiceInput(transcript: string): string {
    if (!transcript) {
      return '';
    }

    let normalized = transcript.trim();

    // Convert to lowercase for case-insensitive comparison
    normalized = normalized.toLowerCase();

    // Remove extra whitespace (multiple spaces, tabs, newlines)
    normalized = normalized.replace(/\s+/g, ' ');

    // Remove common punctuation that might be added by speech recognition
    normalized = normalized.replace(/[.,!?;:]/g, '');

    // Handle common speech-to-text variations
    const replacements: Record<string, string> = {
      // Numbers
      'zero': '0',
      'one': '1',
      'two': '2',
      'three': '3',
      'four': '4',
      'five': '5',
      'six': '6',
      'seven': '7',
      'eight': '8',
      'nine': '9',
      'ten': '10',
      
      // Common variations
      'yeah': 'yes',
      'yep': 'yes',
      'yup': 'yes',
      'nope': 'no',
      'nah': 'no',
      
      // True/False variations
      'correct': 'true',
      'right': 'true',
      'wrong': 'false',
      'incorrect': 'false',
    };

    // Apply replacements for whole words only
    Object.entries(replacements).forEach(([from, to]) => {
      const regex = new RegExp(`\\b${from}\\b`, 'gi');
      normalized = normalized.replace(regex, to);
    });

    return normalized;
  }

  /**
   * Validate a voice answer against the correct answer for a question
   * 
   * @param transcript - Voice input transcript
   * @param correctAnswer - The correct answer(s) for the question
   * @param questionType - Type of question being answered
   * @returns True if the voice answer is correct, false otherwise
   */
  validateVoiceAnswer(
    transcript: string,
    correctAnswer: string | string[] | Record<string, string> | number[],
    questionType: QuestionType
  ): boolean {
    // Handle empty or whitespace-only input
    if (!transcript || transcript.trim() === '') {
      return false;
    }

    switch (questionType) {
      case 'mcq':
        return this.validateMCQVoiceAnswer(transcript, correctAnswer as string);
      
      case 'true-false':
        return this.validateTrueFalseVoiceAnswer(transcript, correctAnswer as string);
      
      case 'fill-blank':
        return this.validateFillBlankVoiceAnswer(transcript, correctAnswer as string[]);
      
      case 'matching':
        // Matching questions are complex for voice input, require exact format
        return this.validateMatchingVoiceAnswer(transcript, correctAnswer as Record<string, string>);
      
      case 'rearrange':
        // Rearrange questions require ordered list, validate sequence
        return this.validateRearrangeVoiceAnswer(transcript, correctAnswer as number[]);
      
      default:
        return false;
    }
  }

  /**
   * Validate MCQ voice answer
   * Accepts option letter (a, b, c, d), option number (1, 2, 3, 4), or partial text match
   */
  private validateMCQVoiceAnswer(transcript: string, correctAnswer: string): boolean {
    const normalizedTranscript = this.normalizeVoiceInput(transcript);
    const normalizedAnswer = this.normalizeVoiceInput(correctAnswer);
    
    // Direct match
    if (normalizedTranscript === normalizedAnswer) {
      return true;
    }

    // Check if transcript contains the correct answer
    if (normalizedTranscript.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedTranscript)) {
      return true;
    }

    // Check for option letter/number patterns (e.g., "option a", "a", "1", "option 1")
    const optionMatch = normalizedTranscript.match(/(?:option\s+)?([a-f]|[1-6])/i);
    if (optionMatch) {
      const spokenOption = optionMatch[1].toLowerCase();
      // Check if the correct answer starts with this letter/number
      if (normalizedAnswer.startsWith(spokenOption)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate True/False voice answer
   * Accepts variations like "true", "false", "yes", "no", "correct", "incorrect"
   */
  private validateTrueFalseVoiceAnswer(transcript: string, correctAnswer: string): boolean {
    const normalizedTranscript = this.normalizeVoiceInput(transcript);
    const normalizedAnswer = this.normalizeVoiceInput(correctAnswer);
    
    // Direct match after normalization
    if (normalizedTranscript === normalizedAnswer) {
      return true;
    }

    // Handle true variations
    if (normalizedAnswer === 'true') {
      return ['true', 'yes', 't', 'correct', 'right'].includes(normalizedTranscript);
    }

    // Handle false variations
    if (normalizedAnswer === 'false') {
      return ['false', 'no', 'f', 'incorrect', 'wrong'].includes(normalizedTranscript);
    }

    return false;
  }

  /**
   * Validate Fill-in-the-Blank voice answer
   * Compares each blank answer with fuzzy matching
   */
  private validateFillBlankVoiceAnswer(transcript: string, correctAnswers: string[]): boolean {
    // For single blank, direct comparison
    if (correctAnswers.length === 1) {
      const normalizedTranscript = this.normalizeVoiceInput(transcript);
      const normalizedAnswer = this.normalizeVoiceInput(correctAnswers[0]);
      return this.fuzzyMatch(normalizedTranscript, normalizedAnswer);
    }

    // For multiple blanks, split BEFORE normalization to preserve delimiters
    // Split by comma or " and " (with spaces)
    const rawSpokenAnswers = transcript
      .split(/,\s*|\s+and\s+/)
      .map(a => a.trim())
      .filter(a => a.length > 0);
    
    if (rawSpokenAnswers.length !== correctAnswers.length) {
      return false;
    }

    // Normalize each spoken answer and compare
    return rawSpokenAnswers.every((spoken, index) => {
      const normalizedSpoken = this.normalizeVoiceInput(spoken);
      const normalizedCorrect = this.normalizeVoiceInput(correctAnswers[index]);
      return this.fuzzyMatch(normalizedSpoken, normalizedCorrect);
    });
  }

  /**
   * Validate Matching voice answer
   * Expects format like "a matches 1, b matches 2" or "a to 1, b to 2"
   */
  private validateMatchingVoiceAnswer(
    transcript: string,
    correctAnswer: Record<string, string>
  ): boolean {
    const normalizedTranscript = this.normalizeVoiceInput(transcript);
    
    // Parse pairs from normalized transcript
    const pairPattern = /([a-z0-9]+)\s*(?:matches|to|with)\s*([a-z0-9]+)/gi;
    const matches = [...normalizedTranscript.matchAll(pairPattern)];
    
    if (matches.length === 0) {
      return false;
    }

    // Build spoken pairs object
    const spokenPairs: Record<string, string> = {};
    matches.forEach(match => {
      const [, left, right] = match;
      spokenPairs[left.toLowerCase()] = right.toLowerCase();
    });

    // Normalize correct answer keys and values
    const normalizedCorrect: Record<string, string> = {};
    Object.entries(correctAnswer).forEach(([key, value]) => {
      normalizedCorrect[this.normalizeVoiceInput(key)] = this.normalizeVoiceInput(value);
    });

    // Check if all pairs match
    const correctKeys = Object.keys(normalizedCorrect);
    const spokenKeys = Object.keys(spokenPairs);

    if (correctKeys.length !== spokenKeys.length) {
      return false;
    }

    return correctKeys.every(key => {
      const correctValue = normalizedCorrect[key];
      const spokenValue = spokenPairs[key];
      return spokenValue && this.fuzzyMatch(spokenValue, correctValue);
    });
  }

  /**
   * Validate Rearrange voice answer
   * Expects ordered list like "1, 2, 3, 4" or "first second third fourth"
   */
  private validateRearrangeVoiceAnswer(transcript: string, correctOrder: number[]): boolean {
    const normalizedTranscript = this.normalizeVoiceInput(transcript);
    
    // Try to parse numbers from transcript
    const numberPattern = /\d+/g;
    const numbers = normalizedTranscript.match(numberPattern);
    
    if (numbers) {
      const spokenOrder = numbers.map(n => parseInt(n, 10));
      return JSON.stringify(spokenOrder) === JSON.stringify(correctOrder);
    }

    // Try to parse ordinal words (first, second, third, etc.)
    const ordinals = [
      'first', 'second', 'third', 'fourth', 'fifth',
      'sixth', 'seventh', 'eighth', 'ninth', 'tenth'
    ];
    
    const words = normalizedTranscript.split(/\s+/);
    const spokenOrder: number[] = [];
    
    words.forEach(word => {
      const index = ordinals.indexOf(word);
      if (index !== -1) {
        spokenOrder.push(index);
      }
    });

    if (spokenOrder.length === correctOrder.length) {
      return JSON.stringify(spokenOrder) === JSON.stringify(correctOrder);
    }

    return false;
  }

  /**
   * Fuzzy string matching with tolerance for minor differences
   * Uses Levenshtein distance for similarity comparison
   */
  private fuzzyMatch(str1: string, str2: string, threshold: number = 0.8): boolean {
    // Exact match
    if (str1 === str2) {
      return true;
    }

    // One contains the other
    if (str1.includes(str2) || str2.includes(str1)) {
      return true;
    }

    // Calculate similarity using Levenshtein distance
    const similarity = this.calculateSimilarity(str1, str2);
    return similarity >= threshold;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns a value between 0 (completely different) and 1 (identical)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Returns the minimum number of single-character edits required to change one string into the other
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
