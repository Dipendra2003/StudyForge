import type { QuestionType } from "../../shared/quiz-types";

/**
 * Parameters for building a batch quiz prompt
 */
export interface BatchPromptParams {
  category: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  types: QuestionType[];
  count: number;
}

/**
 * Builds prompts for batch quiz generation.
 * Constructs a single prompt that requests all questions at once,
 * including type-specific schemas for each requested question type.
 */
export class BatchPromptBuilder {
  /**
   * Build a complete batch prompt with all parameters
   * @param params - The batch prompt parameters
   * @returns The constructed prompt string
   */
  build(params: BatchPromptParams): string {
    const { category, topic, difficulty, types, count } = params;

    // Get unique types and their schemas
    const uniqueTypes = [...new Set(types)];
    const typeSchemas = uniqueTypes.map(type => this.getTypeSchema(type)).join('\n\n');
    const typesList = uniqueTypes.map(t => this.formatTypeName(t)).join(', ');

    return `You are an expert AI question generator for a production-grade quiz system.
Your task is to generate quiz questions in ONE SINGLE RESPONSE.

━━━━━━━━━━━━━━━━━━━━━━ INPUT PARAMETERS ━━━━━━━━━━━━━━━━━━━━━━
Category: ${category}
Topic: ${topic}
Difficulty: ${difficulty}
Question Types: ${typesList}
Total Questions Required: ${count}

━━━━━━━━━━━━━━━━━━━━━━ STRICT RULES (MANDATORY) ━━━━━━━━━━━━━━━━━━━━━━
1. Generate EXACTLY ${count} questions — no more, no less.
2. ALL questions must be strictly related to Category AND Topic.
3. All questions must be COMPLETELY UNIQUE - NO DUPLICATES ALLOWED.
4. DO NOT repeat concepts, rephrase the same question, or ask about the same thing twice.
5. Each question must test a DIFFERENT concept, formula, or aspect of the topic.
6. Balance difficulty evenly across questions.
7. Use clear, simple, unambiguous language.
8. Do NOT include markdown, explanations outside JSON, or extra text.
9. Distribute questions across the requested types: ${typesList}
10. CRITICAL: For MCQ questions, VERIFY your answer is correct before setting correctAnswer
11. CRITICAL: The answer in the explanation MUST match the correctAnswer field
12. CRITICAL: Double-check all math, logic, and facts before finalizing
13. CRITICAL: The correct answer MUST be one of the provided options

━━━━━━━━━━━━━━━━━━━━━━ DUPLICATE PREVENTION ━━━━━━━━━━━━━━━━━━━━━━
BEFORE ADDING EACH QUESTION:
- Check if you've already asked about this concept
- Ensure the question text is different from all previous questions
- Ensure you're testing a different skill or knowledge point
- If similar, modify to test a DIFFERENT aspect or use DIFFERENT examples

━━━━━━━━━━━━━━━━━━━━━━ QUESTION FORMAT ━━━━━━━━━━━━━━━━━━━━━━
Return ONLY a valid JSON ARRAY containing exactly ${count} question objects.

${typeSchemas}

━━━━━━━━━━━━━━━━━━━━━━ OUTPUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY a JSON array with ${count} questions. No additional text or markdown.

BEFORE FINALIZING:
- Verify NO duplicate questions exist in your response
- For each MCQ, solve the problem yourself step-by-step
- Verify the correctAnswer field matches your solution
- Verify the explanation describes the SAME answer as correctAnswer
- If there's any mismatch, fix it before returning

[
  { ... question 1 ... },
  { ... question 2 ... },
  ...
]`;
  }

  /**
   * Get the JSON schema template for a specific question type
   * @param type - The question type
   * @returns The schema template string
   */
  private getTypeSchema(type: QuestionType): string {
    switch (type) {
      case 'mcq':
        return this.getMCQSchema();
      case 'true-false':
        return this.getTrueFalseSchema();
      case 'fill-blank':
        return this.getFillBlankSchema();
      case 'matching':
        return this.getMatchingSchema();
      case 'rearrange':
        return this.getRearrangeSchema();
      default:
        throw new Error(`Unsupported question type: ${type}`);
    }
  }

  /**
   * Format a question type for display in the prompt
   */
  private formatTypeName(type: QuestionType): string {
    switch (type) {
      case 'mcq':
        return 'MCQ';
      case 'true-false':
        return 'TRUE_FALSE';
      case 'fill-blank':
        return 'FILL_BLANK';
      case 'matching':
        return 'MATCHING';
      case 'rearrange':
        return 'REARRANGE';
      default:
        const exhaustiveCheck: never = type;
        throw new Error(`Unsupported question type: ${exhaustiveCheck}`);
    }
  }

  private getMCQSchema(): string {
    return `MCQ (Multiple Choice Question) Schema:
{
  "type": "mcq",
  "question": "Your question text here",
  "options": [
    { "id": "a", "text": "First option" },
    { "id": "b", "text": "Second option" },
    { "id": "c", "text": "Third option" },
    { "id": "d", "text": "Fourth option" }
  ],
  "correctAnswer": "a",
  "explanation": "Brief explanation of why this is correct"
}

CRITICAL MCQ RULES:
- The "correctAnswer" field MUST be one of: "a", "b", "c", or "d"
- The correct answer MUST actually be present in the options array
- The explanation MUST reference the SAME answer as the correctAnswer field
- Double-check your math/logic before setting correctAnswer
- The option marked as correctAnswer MUST be the actual correct solution

⚠️ MANDATORY ANSWER RANDOMIZATION (CRITICAL - DO NOT IGNORE) ⚠️:
YOU MUST DISTRIBUTE CORRECT ANSWERS EVENLY ACROSS ALL FOUR POSITIONS!

REQUIRED DISTRIBUTION (for 10 questions):
- Position 'a': 2-3 questions
- Position 'b': 2-3 questions  
- Position 'c': 2-3 questions
- Position 'd': 2-3 questions

FORBIDDEN PATTERNS:
❌ NEVER: b, b, b, b, b, b, b, b, c, b (90% are 'b')
❌ NEVER: More than 3 consecutive answers in the same position
❌ NEVER: More than 40% of total answers in any single position
✅ GOOD: a, c, b, d, a, c, b, d, a, c (evenly distributed)
✅ GOOD: d, a, c, b, d, a, c, b, a, d (evenly distributed)

GENERATION STRATEGY:
1. Before setting each correctAnswer, check your previous answers
2. Consciously rotate through positions: a → b → c → d → a → b → c → d
3. If you just used 'b' twice, use 'a', 'c', or 'd' next
4. Shuffle your options so the factually correct answer lands in different positions
5. Think: "Which position haven't I used recently?" then place the correct answer there

VERIFICATION BEFORE SUBMITTING:
Count your answers: How many 'a'? How many 'b'? How many 'c'? How many 'd'?
If any position has more than 40% of answers, REBALANCE IMMEDIATELY!`;
  }

  private getTrueFalseSchema(): string {
    return `TRUE_FALSE Schema:
{
  "type": "true-false",
  "question": "Statement to evaluate as true or false",
  "questionData": {
    "statement": "Same statement as question"
  },
  "correctAnswer": "true",
  "explanation": "Brief explanation of why this is true/false"
}`;
  }

  private getFillBlankSchema(): string {
    return `FILL_BLANK Schema:
{
  "type": "fill-blank",
  "question": "The capital of France is ___",
  "questionData": {
    "template": "The capital of France is ___",
    "blanks": [
      { "id": "blank1", "position": 0, "correctAnswer": "Paris", "caseSensitive": false }
    ]
  },
  "correctAnswer": ["Paris"],
  "explanation": "Brief explanation"
}`;
  }

  private getMatchingSchema(): string {
    return `MATCHING Schema:
{
  "type": "matching",
  "question": "Match the following items",
  "questionData": {
    "leftColumn": [
      { "id": "l1", "text": "Item 1" },
      { "id": "l2", "text": "Item 2" },
      { "id": "l3", "text": "Item 3" },
      { "id": "l4", "text": "Item 4" }
    ],
    "rightColumn": [
      { "id": "r1", "text": "Match 1" },
      { "id": "r2", "text": "Match 2" },
      { "id": "r3", "text": "Match 3" },
      { "id": "r4", "text": "Match 4" }
    ],
    "correctPairs": [["l1", "r1"], ["l2", "r2"], ["l3", "r3"], ["l4", "r4"]]
  },
  "correctAnswer": { "l1": "r1", "l2": "r2", "l3": "r3", "l4": "r4" },
  "explanation": "Brief explanation of the matches"
}`;
  }

  private getRearrangeSchema(): string {
    return `REARRANGE Schema:
{
  "type": "rearrange",
  "question": "Arrange these historical events in chronological order from earliest to latest",
  "questionData": {
    "items": ["French Revolution", "Fall of Western Roman Empire", "Discovery of Americas", "Black Death pandemic"],
    "correctOrder": [1, 3, 0, 2]
  },
  "correctAnswer": [1, 3, 0, 2],
  "explanation": "The correct chronological order is: Fall of Western Roman Empire (476 AD), Black Death pandemic (1347-1353), Discovery of Americas (1492), French Revolution (1789-1799)"
}

REARRANGE RULES:
- The "items" array contains the items to be arranged (shown in random order to the user)
- The "correctOrder" array contains indices (0-based) representing the correct sequence
- Example: [1, 3, 0, 2] means: items[1] is first, items[3] is second, items[0] is third, items[2] is fourth
- The correctAnswer field must match the correctOrder in questionData
- Provide clear explanation of the correct sequence`;
  }
}

// Export singleton instance
export const batchPromptBuilder = new BatchPromptBuilder();
