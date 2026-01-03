/**
 * Custom error types for AI quiz generation
 * Requirement 28.5: Specific AI error messaging
 */

export enum AIErrorCode {
  API_TIMEOUT = 'API_TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  API_KEY_ERROR = 'API_KEY_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  GENERATION_FAILED = 'GENERATION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AIError extends Error {
  public readonly code: AIErrorCode;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly originalError?: Error;

  constructor(
    code: AIErrorCode,
    userMessage: string,
    retryable: boolean = false,
    originalError?: Error
  ) {
    super(userMessage);
    this.name = 'AIError';
    this.code = code;
    this.userMessage = userMessage;
    this.retryable = retryable;
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }

  /**
   * Create an AIError from a generic error
   */
  static fromError(error: Error): AIError {
    const errorMessage = error.message.toLowerCase();

    // API timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return new AIError(
        AIErrorCode.API_TIMEOUT,
        'AI question generation timed out. Please try again or use database questions.',
        true,
        error
      );
    }

    // Rate limit errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('429') || errorMessage.includes('too many requests')) {
      return new AIError(
        AIErrorCode.RATE_LIMIT,
        'AI service rate limit reached. Please wait a moment and try again, or use database questions.',
        true,
        error
      );
    }

    // API key errors
    if (errorMessage.includes('api key') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
      return new AIError(
        AIErrorCode.API_KEY_ERROR,
        'AI service configuration error. Please use database questions or contact support.',
        false,
        error
      );
    }

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('503')
    ) {
      return new AIError(
        AIErrorCode.NETWORK_ERROR,
        'Network connection issue. Please check your internet and try again, or use database questions.',
        true,
        error
      );
    }

    // Invalid response errors
    if (
      errorMessage.includes('invalid') ||
      errorMessage.includes('parse') ||
      errorMessage.includes('json') ||
      errorMessage.includes('400')
    ) {
      return new AIError(
        AIErrorCode.INVALID_RESPONSE,
        'AI generated an invalid response. Please try again or use database questions.',
        true,
        error
      );
    }

    // Generation failed errors
    if (errorMessage.includes('failed to generate') || errorMessage.includes('generation failed')) {
      return new AIError(
        AIErrorCode.GENERATION_FAILED,
        'AI question generation failed. Please try again or use database questions.',
        true,
        error
      );
    }

    // Unknown errors
    return new AIError(
      AIErrorCode.UNKNOWN_ERROR,
      'AI question generation unavailable. Please try again or use database questions.',
      true,
      error
    );
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      code: this.code,
      message: this.userMessage,
      retryable: this.retryable,
    };
  }
}
