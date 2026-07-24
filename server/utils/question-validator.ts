/**
 * Question Validator Utility
 * 
 * Validates AI-generated questions to ensure correctness
 * before they are saved to the database or presented to users.
 */

import type { Question } from '../../shared/quiz-types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Safely evaluate a math expression following BODMAS/PEMDAS rules
 * Returns null if the expression cannot be evaluated
 */
function evaluateMathExpression(expr: string): number | null {
  try {
    // Remove spaces and convert × and ÷ to * and /
    let cleanExpr = expr.replace(/\s/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/x/gi, '*'); // Handle 'x' as multiplication
    
    // Only allow numbers, operators, parentheses, and decimal points
    if (!/^[\d+\-*\/().]+$/.test(cleanExpr)) {
      return null;
    }
    
    // Use Function constructor for safe evaluation (better than eval)
    // This only works with mathematical expressions
    const result = Function(`'use strict'; return (${cleanExpr})`)();
    
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      // Round to 2 decimal places to avoid floating point issues
      return Math.round(result * 100) / 100;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Validate a single MCQ question for logical correctness
 */
export function validateMCQQuestion(question: Question): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (question.type !== 'mcq') {
    return { isValid: true, errors: [], warnings: [] };
  }

  const questionData = question.questionData as any;
  const correctAnswer = question.correctAnswer as string;
  const explanation = (question.explanation || '').toLowerCase();

  // Check 1: Verify correctAnswer exists in options
  const optionIds = questionData.options?.map((opt: any) => opt.id.toLowerCase()) || [];
  if (!optionIds.includes(correctAnswer.toLowerCase())) {
    errors.push(`Correct answer '${correctAnswer}' not found in options`);
  }

  // Check 2: Extract numeric values from options for math questions
  const options = questionData.options || [];
  const numericOptions: { id: string; value: number; text: string }[] = [];
  
  for (const opt of options) {
    // Try to extract a number from the option text
    const numMatch = opt.text.match(/^-?\d+\.?\d*$/);
    if (numMatch) {
      numericOptions.push({
        id: opt.id,
        value: parseFloat(numMatch[0]),
        text: opt.text
      });
    }
  }

  // Check 3: For math questions, verify the answer by checking explanation
  if (numericOptions.length >= 2) {
    // This is likely a math question with numeric answers
    // Try to find the calculated answer in the explanation
    const numberMatches = explanation.match(/=\s*(-?\d+\.?\d*)/g);
    
    if (numberMatches && numberMatches.length > 0) {
      // Get the last calculated value (usually the final answer)
      const lastMatch = numberMatches[numberMatches.length - 1];
      const calculatedValue = parseFloat(lastMatch.replace('=', '').trim());
      
      // CRITICAL CHECK: Verify the calculated value exists in the options
      const calculatedValueInOptions = numericOptions.some(opt => 
        Math.abs(opt.value - calculatedValue) < 0.01
      );
      
      if (!calculatedValueInOptions) {
        errors.push(
          `Math question: Explanation shows answer = ${calculatedValue}, but this value is NOT in the options. Available options: ${numericOptions.map(o => o.text).join(', ')}`
        );
      }
      
      // Find which option matches this calculated value
      const matchingOption = numericOptions.find(opt => 
        Math.abs(opt.value - calculatedValue) < 0.01 // Allow small floating point differences
      );
      
      if (matchingOption && matchingOption.id.toLowerCase() !== correctAnswer.toLowerCase()) {
        errors.push(
          `Math question: Explanation shows answer = ${calculatedValue} (option ${matchingOption.id}: "${matchingOption.text}"), but correctAnswer is set to '${correctAnswer}'`
        );
      }
    }
  }

  // Check 4: Look for contradictions in explanation
  const contradictionPatterns = [
    /correct answer is ['"]?(\w+)['"]?/i,
    /answer is ['"]?(\w+)['"]?/i,
    /should be ['"]?(\w+)['"]?/i,
    /actually ['"]?(\w+)['"]?/i,
    /apologies.*?['"]?(\w+)['"]?/i,
    /option ['"]?(\w+)['"]? is correct/i,
  ];

  for (const pattern of contradictionPatterns) {
    const match = explanation.match(pattern);
    if (match && match[1]) {
      const mentionedAnswer = match[1].toLowerCase();
      
      // Check if mentioned answer is different from correctAnswer
      if (mentionedAnswer !== correctAnswer.toLowerCase()) {
        // Check if it's one of the other option IDs
        if (optionIds.includes(mentionedAnswer)) {
          errors.push(
            `Explanation mentions '${match[1]}' as correct but correctAnswer is '${correctAnswer}'`
          );
        }
        
        // Check if it's a number that matches another option
        const correctOption = questionData.options?.find(
          (opt: any) => opt.id.toLowerCase() === correctAnswer.toLowerCase()
        );
        const mentionedOption = questionData.options?.find(
          (opt: any) => opt.text.toLowerCase().includes(mentionedAnswer)
        );
        
        if (mentionedOption && mentionedOption.id !== correctAnswer) {
          errors.push(
            `Explanation mentions '${mentionedAnswer}' but correctAnswer points to '${correctOption?.text}'`
          );
        }
      }
    }
  }

  // Check 5: Look for apology phrases (indicates AI made a mistake)
  const apologyPatterns = [
    /apolog/i,
    /sorry/i,
    /mistake/i,
    /error/i,
    /incorrect/i,
  ];

  for (const pattern of apologyPatterns) {
    if (pattern.test(explanation)) {
      warnings.push('Explanation contains apology/error phrases - may indicate incorrect answer');
    }
  }

  // Check 6: Verify math questions if applicable
  if (question.question.match(/\d+\s*[\+\-\*\/\^]\s*\d+/)) {
    warnings.push('Math question detected - manual verification recommended');
    
    // Try to evaluate the expression if it's a simple "Evaluate:" or "Calculate:" question
    const evaluateMatch = question.question.match(/(?:evaluate|calculate|simplify|solve):\s*(.+?)(?:\?|$)/i);
    if (evaluateMatch && numericOptions.length >= 2) {
      const expression = evaluateMatch[1].trim();
      try {
        // Try to evaluate the expression safely
        const result = evaluateMathExpression(expression);
        if (result !== null) {
          // Check if this result exists in the options
          const resultInOptions = numericOptions.some(opt => 
            Math.abs(opt.value - result) < 0.01
          );
          
          if (!resultInOptions) {
            errors.push(
              `Math expression "${expression}" evaluates to ${result}, but this value is NOT in the options. Available: ${numericOptions.map(o => o.text).join(', ')}`
            );
          } else {
            // Check if the correctAnswer matches the evaluated result
            const correctOption = questionData.options?.find(
              (opt: any) => opt.id.toLowerCase() === correctAnswer.toLowerCase()
            );
            if (correctOption) {
              const correctValue = parseFloat(correctOption.text);
              if (!isNaN(correctValue) && Math.abs(correctValue - result) > 0.01) {
                errors.push(
                  `Math expression "${expression}" evaluates to ${result}, but correctAnswer points to option '${correctAnswer}' with value ${correctValue}`
                );
              }
            }
          }
        }
      } catch (e) {
        // Evaluation failed, just add a warning
        warnings.push(`Could not automatically evaluate expression: ${expression}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a batch of questions
 */
export function validateQuestions(questions: Question[]): {
  validQuestions: Question[];
  invalidQuestions: Array<{ question: Question; errors: string[] }>;
  totalWarnings: number;
} {
  const validQuestions: Question[] = [];
  const invalidQuestions: Array<{ question: Question; errors: string[] }> = [];
  let totalWarnings = 0;

  // Track seen questions to detect duplicates
  const seenQuestions = new Set<string>();

  for (const question of questions) {
    // Check for duplicate questions (same question text)
    const normalizedQuestion = question.question.toLowerCase().trim();
    if (seenQuestions.has(normalizedQuestion)) {
      console.warn(`Duplicate question detected: "${question.question.substring(0, 100)}"`);
      invalidQuestions.push({
        question,
        errors: ['Duplicate question - same question text already exists in this batch'],
      });
      continue;
    }
    seenQuestions.add(normalizedQuestion);

    const result = validateMCQQuestion(question);
    
    if (result.isValid) {
      validQuestions.push(question);
      totalWarnings += result.warnings.length;
      
      if (result.warnings.length > 0) {
        console.warn(`Question ${question.id} has warnings:`, result.warnings);
      }
    } else {
      invalidQuestions.push({
        question,
        errors: result.errors,
      });
      console.error(`Question ${question.id} validation failed:`, result.errors);
    }
  }

  return {
    validQuestions,
    invalidQuestions,
    totalWarnings,
  };
}

/**
 * Auto-fix common issues in questions (if possible)
 */
export function attemptAutoFix(question: Question): Question | null {
  if (question.type !== 'mcq') {
    return question;
  }

  const questionData = question.questionData as any;
  const explanation = (question.explanation || '').toLowerCase();
  const options = questionData.options || [];
  
  // Strategy 1: Try to extract the correct answer from explanation text patterns
  const patterns = [
    /the correct answer is ['"](.*?)['"]/i,
    /correct answer is ['"]?(\w+)['"]?/i,
    /answer is ['"]?(\w+)['"]?/i,
    /option ['"]?(\w+)['"]? is correct/i,
  ];

  for (const pattern of patterns) {
    const match = explanation.match(pattern);
    if (match && match[1]) {
      const mentionedAnswer = match[1].toLowerCase();
      
      // Check if this matches an option ID or option text
      const matchingOption = options.find(
        (opt: any) => opt.id.toLowerCase() === mentionedAnswer || opt.text.toLowerCase() === mentionedAnswer
      );
      
      if (matchingOption) {
        console.log(`Auto-fixing question: changing correctAnswer from '${question.correctAnswer}' to '${matchingOption.id}'`);
        return {
          ...question,
          correctAnswer: matchingOption.id,
        };
      }
    }
  }
  
  // Strategy 2: For math questions, extract calculated value from explanation
  const numericOptions: { id: string; value: number; text: string }[] = [];
  
  for (const opt of options) {
    // Try to extract a number from the option text
    const numMatch = opt.text.match(/^-?\d+\.?\d*$/);
    if (numMatch) {
      numericOptions.push({
        id: opt.id,
        value: parseFloat(numMatch[0]),
        text: opt.text
      });
    }
  }
  
  if (numericOptions.length >= 2) {
    // This is likely a math question - try to find the calculated answer
    const numberMatches = explanation.match(/=\s*(-?\d+\.?\d*)/g);
    
    if (numberMatches && numberMatches.length > 0) {
      // Get the last calculated value (usually the final answer)
      const lastMatch = numberMatches[numberMatches.length - 1];
      const calculatedValue = parseFloat(lastMatch.replace('=', '').trim());
      
      // Find which option matches this calculated value
      const matchingOption = numericOptions.find(opt => 
        Math.abs(opt.value - calculatedValue) < 0.01
      );
      
      if (matchingOption && matchingOption.id !== question.correctAnswer) {
        console.log(`Auto-fixing math question: changing correctAnswer from '${question.correctAnswer}' to '${matchingOption.id}' (calculated value: ${calculatedValue})`);
        return {
          ...question,
          correctAnswer: matchingOption.id,
        };
      }
    }
  }

  return null; // Cannot auto-fix
}
