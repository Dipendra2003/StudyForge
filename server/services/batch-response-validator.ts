import type {
  QuestionType,
  QuestionData,
  MCQData,
  TrueFalseData,
  FillBlankData,
  MatchingData,
  RearrangeData,
} from "../../shared/quiz-types";

/**
 * Represents a validated question from the AI response
 */
export interface ValidatedQuestion {
  type: QuestionType;
  question: string;
  questionData: QuestionData;
  correctAnswer: string | string[] | number[] | Record<string, string>;
  explanation: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  hints?: string[];
}

/**
 * Result of batch response validation
 */
export interface ValidationResult {
  valid: boolean;
  questions: ValidatedQuestion[];
  errors: string[];
}

/**
 * Validates and parses AI batch responses for quiz generation.
 * Ensures the response is a valid JSON array with the expected number
 * of questions, each conforming to its type-specific schema.
 */
export class BatchResponseValidator {
  /**
   * Validate the complete batch response
   * @param parsedResponse - The parsed JSON array from the AI response
   * @param expectedCount - The expected number of questions
   * @param expectedTypes - The expected question types (optional, for type distribution validation)
   * @returns ValidationResult with valid flag, questions array, and errors array
   */
  validate(
    parsedResponse: unknown,
    expectedCount: number,
    expectedTypes?: QuestionType[]
  ): ValidationResult {
    const errors: string[] = [];
    const questions: ValidatedQuestion[] = [];

    // Check if response is an array
    if (!Array.isArray(parsedResponse)) {
      return {
        valid: false,
        questions: [],
        errors: ["Response is not a JSON array"],
      };
    }

    // Check count validation (reject if count < expected)
    if (parsedResponse.length < expectedCount) {
      return {
        valid: false,
        questions: [],
        errors: [
          `Expected ${expectedCount} questions but received ${parsedResponse.length}`,
        ],
      };
    }

    // Validate each question
    for (let i = 0; i < parsedResponse.length; i++) {
      const questionResult = this.validateQuestion(parsedResponse[i], i);
      
      if (!questionResult.valid) {
        // If any question is malformed, reject the entire response
        return {
          valid: false,
          questions: [],
          errors: questionResult.errors,
        };
      }
      
      questions.push(questionResult.question!);
    }

    // Optionally validate type distribution if expectedTypes provided
    if (expectedTypes && expectedTypes.length > 0) {
      const typeValidation = this.validateTypeDistribution(questions, expectedTypes);
      if (!typeValidation.valid) {
        errors.push(...typeValidation.errors);
        // Type distribution mismatch is a warning, not a rejection
      }
    }

    return {
      valid: true,
      questions,
      errors,
    };
  }

  /**
   * Validate a single question against its type schema
   * @param question - The question object to validate
   * @param index - The index of the question in the array (for error messages)
   * @returns Validation result with the validated question or errors
   */
  private validateQuestion(
    question: unknown,
    index: number
  ): { valid: boolean; question?: ValidatedQuestion; errors: string[] } {
    const errors: string[] = [];
    const prefix = `Question ${index + 1}`;

    // Check if question is an object
    if (!question || typeof question !== "object") {
      return {
        valid: false,
        errors: [`${prefix}: Not a valid object`],
      };
    }

    const q = question as Record<string, unknown>;

    // Validate required base fields
    if (!q.type || typeof q.type !== "string") {
      return {
        valid: false,
        errors: [`${prefix}: Missing or invalid 'type' field`],
      };
    }

    if (!q.question || typeof q.question !== "string") {
      return {
        valid: false,
        errors: [`${prefix}: Missing or invalid 'question' field`],
      };
    }

    if (!q.explanation || typeof q.explanation !== "string") {
      return {
        valid: false,
        errors: [`${prefix}: Missing or invalid 'explanation' field`],
      };
    }

    // Normalize type to lowercase with hyphens
    const normalizedType = this.normalizeQuestionType(q.type as string);
    if (!normalizedType) {
      return {
        valid: false,
        errors: [`${prefix}: Unknown question type '${q.type}'`],
      };
    }

    // Validate type-specific schema
    const typeValidation = this.validateTypeSpecificSchema(
      normalizedType,
      q,
      prefix
    );
    if (!typeValidation.valid) {
      return {
        valid: false,
        errors: typeValidation.errors,
      };
    }

    // Build the validated question
    const validatedQuestion: ValidatedQuestion = {
      type: normalizedType,
      question: q.question as string,
      questionData: typeValidation.questionData!,
      correctAnswer: typeValidation.correctAnswer!,
      explanation: q.explanation as string,
    };

    // Add optional fields if present
    if (q.category && typeof q.category === "string") {
      validatedQuestion.category = q.category;
    }
    if (q.difficulty && this.isValidDifficulty(q.difficulty)) {
      validatedQuestion.difficulty = q.difficulty as 'easy' | 'medium' | 'hard';
    }
    if (Array.isArray(q.tags)) {
      validatedQuestion.tags = q.tags.filter((t): t is string => typeof t === "string");
    }
    if (Array.isArray(q.hints)) {
      validatedQuestion.hints = q.hints.filter((h): h is string => typeof h === "string");
    }

    return {
      valid: true,
      question: validatedQuestion,
      errors: [],
    };
  }

  /**
   * Normalize question type string to the expected format
   */
  private normalizeQuestionType(type: string): QuestionType | null {
    const normalized = type.toLowerCase().replace(/_/g, "-");
    
    const typeMap: Record<string, QuestionType> = {
      "mcq": "mcq",
      "true-false": "true-false",
      "truefalse": "true-false",
      "true_false": "true-false",
      "fill-blank": "fill-blank",
      "fillblank": "fill-blank",
      "fill_blank": "fill-blank",
      "matching": "matching",
      "rearrange": "rearrange",
    };

    return typeMap[normalized] || null;
  }

  /**
   * Check if a value is a valid difficulty level
   */
  private isValidDifficulty(value: unknown): boolean {
    return value === "easy" || value === "medium" || value === "hard";
  }

  /**
   * Validate type-specific schema and extract questionData and correctAnswer
   */
  private validateTypeSpecificSchema(
    type: QuestionType,
    question: Record<string, unknown>,
    prefix: string
  ): {
    valid: boolean;
    questionData?: QuestionData;
    correctAnswer?: string | string[] | number[] | Record<string, string>;
    errors: string[];
  } {
    switch (type) {
      case "mcq":
        return this.validateMCQSchema(question, prefix);
      case "true-false":
        return this.validateTrueFalseSchema(question, prefix);
      case "fill-blank":
        return this.validateFillBlankSchema(question, prefix);
      case "matching":
        return this.validateMatchingSchema(question, prefix);
      case "rearrange":
        return this.validateRearrangeSchema(question, prefix);
      default:
        return {
          valid: false,
          errors: [`${prefix}: Unsupported question type '${type}'`],
        };
    }
  }

  /**
   * Validate MCQ question schema
   */
  private validateMCQSchema(
    question: Record<string, unknown>,
    prefix: string
  ): {
    valid: boolean;
    questionData?: MCQData;
    correctAnswer?: string;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate options array
    if (!Array.isArray(question.options)) {
      return {
        valid: false,
        errors: [`${prefix}: MCQ missing 'options' array`],
      };
    }

    const options = question.options as unknown[];
    if (options.length < 2) {
      return {
        valid: false,
        errors: [`${prefix}: MCQ must have at least 2 options`],
      };
    }

    if (options.length > 6) {
      return {
        valid: false,
        errors: [`${prefix}: MCQ must have at most 6 options`],
      };
    }

    // Validate each option
    const validatedOptions: { id: string; text: string }[] = [];
    const optionIds = new Set<string>();

    for (let i = 0; i < options.length; i++) {
      const opt = options[i] as Record<string, unknown>;
      
      if (!opt || typeof opt !== "object") {
        return {
          valid: false,
          errors: [`${prefix}: Option ${i + 1} is not a valid object`],
        };
      }

      if (!opt.id || typeof opt.id !== "string") {
        return {
          valid: false,
          errors: [`${prefix}: Option ${i + 1} missing 'id' field`],
        };
      }

      if (!opt.text || typeof opt.text !== "string") {
        return {
          valid: false,
          errors: [`${prefix}: Option ${i + 1} missing 'text' field`],
        };
      }

      if (optionIds.has(opt.id)) {
        return {
          valid: false,
          errors: [`${prefix}: Duplicate option id '${opt.id}'`],
        };
      }

      optionIds.add(opt.id);
      validatedOptions.push({ id: opt.id, text: opt.text });
    }

    // Validate correctAnswer
    if (!question.correctAnswer || typeof question.correctAnswer !== "string") {
      return {
        valid: false,
        errors: [`${prefix}: MCQ missing 'correctAnswer' field`],
      };
    }

    if (!optionIds.has(question.correctAnswer)) {
      return {
        valid: false,
        errors: [
          `${prefix}: MCQ correctAnswer '${question.correctAnswer}' does not match any option id`,
        ],
      };
    }

    // Additional validation: Check if explanation mentions a different answer
    const explanation = (question.explanation as string || '').toLowerCase();
    const correctAnswerId = question.correctAnswer.toLowerCase();
    
    // Find the text of the correct answer option
    const correctOption = validatedOptions.find(opt => opt.id.toLowerCase() === correctAnswerId);
    
    // Check if explanation contains phrases like "correct answer is X" where X is different
    const wrongAnswerPatterns = [
      /correct answer is (\w+)/i,
      /answer is (\w+)/i,
      /should be (\w+)/i,
    ];
    
    for (const pattern of wrongAnswerPatterns) {
      const match = explanation.match(pattern);
      if (match && match[1]) {
        const mentionedAnswer = match[1].toLowerCase();
        // Check if mentioned answer is different from correctAnswer
        if (mentionedAnswer !== correctAnswerId && 
            mentionedAnswer !== correctOption?.text.toLowerCase() &&
            !correctOption?.text.toLowerCase().includes(mentionedAnswer)) {
          return {
            valid: false,
            errors: [
              `${prefix}: MCQ explanation mentions answer '${match[1]}' but correctAnswer is '${question.correctAnswer}'. This indicates an inconsistency.`,
            ],
          };
        }
      }
    }

    return {
      valid: true,
      questionData: { options: validatedOptions },
      correctAnswer: question.correctAnswer,
      errors: [],
    };
  }

  /**
   * Validate True/False question schema
   */
  private validateTrueFalseSchema(
    question: Record<string, unknown>,
    prefix: string
  ): {
    valid: boolean;
    questionData?: TrueFalseData;
    correctAnswer?: string;
    errors: string[];
  } {
    // Validate correctAnswer
    const correctAnswer = question.correctAnswer;
    
    if (correctAnswer === undefined || correctAnswer === null) {
      return {
        valid: false,
        errors: [`${prefix}: TRUE_FALSE missing 'correctAnswer' field`],
      };
    }

    // Accept boolean or string "true"/"false"
    let normalizedAnswer: string;
    if (typeof correctAnswer === "boolean") {
      normalizedAnswer = correctAnswer ? "true" : "false";
    } else if (typeof correctAnswer === "string") {
      const lower = correctAnswer.toLowerCase();
      if (lower !== "true" && lower !== "false") {
        return {
          valid: false,
          errors: [
            `${prefix}: TRUE_FALSE correctAnswer must be 'true' or 'false'`,
          ],
        };
      }
      normalizedAnswer = lower;
    } else {
      return {
        valid: false,
        errors: [`${prefix}: TRUE_FALSE correctAnswer must be boolean or string`],
      };
    }

    // Get statement from questionData or use the question text
    let statement = question.question as string;
    
    if (question.questionData && typeof question.questionData === "object") {
      const qd = question.questionData as Record<string, unknown>;
      if (qd.statement && typeof qd.statement === "string") {
        statement = qd.statement;
      }
    }

    return {
      valid: true,
      questionData: { statement },
      correctAnswer: normalizedAnswer,
      errors: [],
    };
  }

  /**
   * Validate Fill-in-the-Blank question schema
   */
  private validateFillBlankSchema(
    question: Record<string, unknown>,
    prefix: string
  ): {
    valid: boolean;
    questionData?: FillBlankData;
    correctAnswer?: string[];
    errors: string[];
  } {
    // Check for questionData
    if (!question.questionData || typeof question.questionData !== "object") {
      return {
        valid: false,
        errors: [`${prefix}: FILL_BLANK missing 'questionData' object`],
      };
    }

    const qd = question.questionData as Record<string, unknown>;

    // Validate template
    if (!qd.template || typeof qd.template !== "string") {
      return {
        valid: false,
        errors: [`${prefix}: FILL_BLANK missing 'template' field`],
      };
    }

    // Validate blanks array
    if (!Array.isArray(qd.blanks) || qd.blanks.length === 0) {
      return {
        valid: false,
        errors: [`${prefix}: FILL_BLANK must have at least one blank`],
      };
    }

    const validatedBlanks: {
      id: string;
      position: number;
      correctAnswer: string;
      caseSensitive?: boolean;
    }[] = [];

    for (let i = 0; i < qd.blanks.length; i++) {
      const blank = qd.blanks[i] as Record<string, unknown>;
      
      if (!blank || typeof blank !== "object") {
        return {
          valid: false,
          errors: [`${prefix}: Blank ${i + 1} is not a valid object`],
        };
      }

      if (!blank.id || typeof blank.id !== "string") {
        return {
          valid: false,
          errors: [`${prefix}: Blank ${i + 1} missing 'id' field`],
        };
      }

      if (typeof blank.position !== "number") {
        return {
          valid: false,
          errors: [`${prefix}: Blank ${i + 1} missing 'position' field`],
        };
      }

      if (!blank.correctAnswer || typeof blank.correctAnswer !== "string") {
        return {
          valid: false,
          errors: [`${prefix}: Blank ${i + 1} missing 'correctAnswer' field`],
        };
      }

      validatedBlanks.push({
        id: blank.id,
        position: blank.position,
        correctAnswer: blank.correctAnswer,
        caseSensitive: typeof blank.caseSensitive === "boolean" ? blank.caseSensitive : false,
      });
    }

    // Build correctAnswer array from blanks
    const correctAnswers = validatedBlanks.map((b) => b.correctAnswer);

    // Also accept explicit correctAnswer array if provided
    if (Array.isArray(question.correctAnswer)) {
      const explicitAnswers = question.correctAnswer.filter(
        (a): a is string => typeof a === "string"
      );
      if (explicitAnswers.length === validatedBlanks.length) {
        return {
          valid: true,
          questionData: {
            template: qd.template,
            blanks: validatedBlanks,
          },
          correctAnswer: explicitAnswers,
          errors: [],
        };
      }
    }

    return {
      valid: true,
      questionData: {
        template: qd.template,
        blanks: validatedBlanks,
      },
      correctAnswer: correctAnswers,
      errors: [],
    };
  }

  /**
   * Validate Matching question schema
   */
  private validateMatchingSchema(
    question: Record<string, unknown>,
    prefix: string
  ): {
    valid: boolean;
    questionData?: MatchingData;
    correctAnswer?: Record<string, string>;
    errors: string[];
  } {
    // Check for questionData
    if (!question.questionData || typeof question.questionData !== "object") {
      return {
        valid: false,
        errors: [`${prefix}: MATCHING missing 'questionData' object`],
      };
    }

    const qd = question.questionData as Record<string, unknown>;

    // Validate leftColumn
    if (!Array.isArray(qd.leftColumn) || qd.leftColumn.length < 2) {
      return {
        valid: false,
        errors: [`${prefix}: MATCHING must have at least 2 items in leftColumn`],
      };
    }

    // Validate rightColumn
    if (!Array.isArray(qd.rightColumn) || qd.rightColumn.length < 2) {
      return {
        valid: false,
        errors: [`${prefix}: MATCHING must have at least 2 items in rightColumn`],
      };
    }

    // Validate correctPairs
    if (!Array.isArray(qd.correctPairs) || qd.correctPairs.length === 0) {
      return {
        valid: false,
        errors: [`${prefix}: MATCHING must have at least one correctPair`],
      };
    }

    // Validate left column items
    const leftIds = new Set<string>();
    const validatedLeft: { id: string; text: string }[] = [];

    for (let i = 0; i < qd.leftColumn.length; i++) {
      const item = qd.leftColumn[i] as Record<string, unknown>;
      
      if (!item || typeof item !== "object") {
        return {
          valid: false,
          errors: [`${prefix}: Left column item ${i + 1} is not a valid object`],
        };
      }

      if (!item.id || typeof item.id !== "string") {
        return {
          valid: false,
          errors: [`${prefix}: Left column item ${i + 1} missing 'id' field`],
        };
      }

      if (!item.text || typeof item.text !== "string") {
        return {
          valid: false,
          errors: [`${prefix}: Left column item ${i + 1} missing 'text' field`],
        };
      }

      leftIds.add(item.id);
      validatedLeft.push({ id: item.id, text: item.text });
    }

    // Validate right column items
    const rightIds = new Set<string>();
    const validatedRight: { id: string; text: string }[] = [];

    for (let i = 0; i < qd.rightColumn.length; i++) {
      const item = qd.rightColumn[i] as Record<string, unknown>;
      
      if (!item || typeof item !== "object") {
        return {
          valid: false,
          errors: [`${prefix}: Right column item ${i + 1} is not a valid object`],
        };
      }

      if (!item.id || typeof item.id !== "string") {
        return {
          valid: false,
          errors: [`${prefix}: Right column item ${i + 1} missing 'id' field`],
        };
      }

      if (!item.text || typeof item.text !== "string") {
        return {
          valid: false,
          errors: [`${prefix}: Right column item ${i + 1} missing 'text' field`],
        };
      }

      rightIds.add(item.id);
      validatedRight.push({ id: item.id, text: item.text });
    }

    // Validate correct pairs
    const validatedPairs: [string, string][] = [];
    const correctAnswerMap: Record<string, string> = {};

    for (let i = 0; i < qd.correctPairs.length; i++) {
      const pair = qd.correctPairs[i];
      
      if (!Array.isArray(pair) || pair.length !== 2) {
        return {
          valid: false,
          errors: [`${prefix}: Correct pair ${i + 1} must be an array of 2 elements`],
        };
      }

      const [leftId, rightId] = pair;

      if (typeof leftId !== "string" || typeof rightId !== "string") {
        return {
          valid: false,
          errors: [`${prefix}: Correct pair ${i + 1} must contain string IDs`],
        };
      }

      if (!leftIds.has(leftId)) {
        return {
          valid: false,
          errors: [`${prefix}: Correct pair references unknown left ID '${leftId}'`],
        };
      }

      if (!rightIds.has(rightId)) {
        return {
          valid: false,
          errors: [`${prefix}: Correct pair references unknown right ID '${rightId}'`],
        };
      }

      validatedPairs.push([leftId, rightId]);
      correctAnswerMap[leftId] = rightId;
    }

    return {
      valid: true,
      questionData: {
        leftColumn: validatedLeft,
        rightColumn: validatedRight,
        correctPairs: validatedPairs,
      },
      correctAnswer: correctAnswerMap,
      errors: [],
    };
  }

  /**
   * Validate Rearrange question schema
   */
  private validateRearrangeSchema(
    question: Record<string, unknown>,
    prefix: string
  ): {
    valid: boolean;
    questionData?: RearrangeData;
    correctAnswer?: number[];
    errors: string[];
  } {
    // Check for questionData
    if (!question.questionData || typeof question.questionData !== "object") {
      return {
        valid: false,
        errors: [`${prefix}: REARRANGE missing 'questionData' object`],
      };
    }

    const qd = question.questionData as Record<string, unknown>;

    // Validate items array
    if (!Array.isArray(qd.items) || qd.items.length < 2) {
      return {
        valid: false,
        errors: [`${prefix}: REARRANGE must have at least 2 items`],
      };
    }

    const validatedItems: string[] = [];
    for (let i = 0; i < qd.items.length; i++) {
      if (typeof qd.items[i] !== "string") {
        return {
          valid: false,
          errors: [`${prefix}: REARRANGE item ${i + 1} must be a string`],
        };
      }
      validatedItems.push(qd.items[i] as string);
    }

    // Validate correctOrder array
    if (!Array.isArray(qd.correctOrder) || qd.correctOrder.length < 2) {
      return {
        valid: false,
        errors: [`${prefix}: REARRANGE must have correctOrder array`],
      };
    }

    if (qd.correctOrder.length !== validatedItems.length) {
      return {
        valid: false,
        errors: [
          `${prefix}: REARRANGE correctOrder length must match items length`,
        ],
      };
    }

    const validatedOrder: number[] = [];
    const seenIndices = new Set<number>();

    for (let i = 0; i < qd.correctOrder.length; i++) {
      const idx = qd.correctOrder[i];
      
      if (typeof idx !== "number" || !Number.isInteger(idx)) {
        return {
          valid: false,
          errors: [`${prefix}: REARRANGE correctOrder must contain integers`],
        };
      }

      if (idx < 0 || idx >= validatedItems.length) {
        return {
          valid: false,
          errors: [
            `${prefix}: REARRANGE correctOrder index ${idx} out of bounds`,
          ],
        };
      }

      if (seenIndices.has(idx)) {
        return {
          valid: false,
          errors: [`${prefix}: REARRANGE correctOrder has duplicate index ${idx}`],
        };
      }

      seenIndices.add(idx);
      validatedOrder.push(idx);
    }

    return {
      valid: true,
      questionData: {
        items: validatedItems,
        correctOrder: validatedOrder,
      },
      correctAnswer: validatedOrder,
      errors: [],
    };
  }

  /**
   * Validate that questions include the expected types (warning only)
   */
  private validateTypeDistribution(
    questions: ValidatedQuestion[],
    expectedTypes: QuestionType[]
  ): { valid: boolean; errors: string[] } {
    const actualTypes = new Set(questions.map((q) => q.type));
    const missingTypes = expectedTypes.filter((t) => !actualTypes.has(t));

    if (missingTypes.length > 0) {
      return {
        valid: false,
        errors: [
          `Expected question types not present: ${missingTypes.join(", ")}`,
        ],
      };
    }

    return { valid: true, errors: [] };
  }
}

// Export singleton instance
export const batchResponseValidator = new BatchResponseValidator();
