/**
 * Batch JSON Parser with Sanitization
 * 
 * Parses AI responses containing JSON arrays of quiz questions.
 * Handles common formatting issues like markdown code blocks,
 * trailing commas, and unescaped characters.
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

/**
 * Error thrown when JSON parsing fails
 */
export class BatchJsonParseError extends Error {
  public readonly rawResponse: string;
  public readonly parseAttempts: string[];

  constructor(message: string, rawResponse: string, parseAttempts: string[] = []) {
    super(message);
    this.name = 'BatchJsonParseError';
    this.rawResponse = rawResponse;
    this.parseAttempts = parseAttempts;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BatchJsonParseError);
    }
  }
}

/**
 * Extract JSON array from AI response, handling markdown code blocks
 * @param response - The raw AI response string
 * @returns The extracted JSON string (without markdown wrappers)
 */
function extractJsonFromResponse(response: string): string {
  let content = response.trim();

  // Handle markdown code blocks with language specifier (```json, ```JSON, etc.)
  const jsonCodeBlockRegex = /```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/;
  const codeBlockMatch = content.match(jsonCodeBlockRegex);
  
  if (codeBlockMatch) {
    content = codeBlockMatch[1].trim();
  }

  // If content doesn't start with '[', try to find the array
  if (!content.startsWith('[')) {
    // Look for the first '[' and last ']' to extract the array
    const firstBracket = content.indexOf('[');
    const lastBracket = content.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      content = content.substring(firstBracket, lastBracket + 1);
    }
  }

  return content.trim();
}

/**
 * Sanitize common JSON formatting issues
 * @param jsonString - The JSON string to sanitize
 * @returns The sanitized JSON string
 */
function sanitizeJson(jsonString: string): string {
  let sanitized = jsonString;

  // Remove trailing commas before closing brackets/braces
  // Matches: , followed by optional whitespace and then ] or }
  sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');

  // Handle unescaped newlines within strings (replace with \n)
  // This is tricky - we need to be careful not to break valid JSON
  // Only fix obvious cases where there's a newline inside a string value
  
  // Handle unescaped backslashes that aren't part of valid escape sequences
  // Valid escape sequences: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
  sanitized = sanitized.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

  // Handle single quotes used instead of double quotes for strings
  // This is a common AI mistake - convert 'value' to "value" in JSON context
  // Only do this if the JSON doesn't parse and we detect single quotes
  
  return sanitized;
}

/**
 * Attempt to fix single quotes in JSON (used as fallback)
 * @param jsonString - The JSON string with potential single quote issues
 * @returns The fixed JSON string
 */
function fixSingleQuotes(jsonString: string): string {
  // This is a simplified approach - replace single quotes with double quotes
  // when they appear to be used as string delimiters
  // Be careful not to replace apostrophes within strings
  
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;
  
  while (i < jsonString.length) {
    const char = jsonString[i];
    const prevChar = i > 0 ? jsonString[i - 1] : '';
    
    if (!inString) {
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        result += '"'; // Always use double quotes
      } else {
        result += char;
      }
    } else {
      if (char === stringChar && prevChar !== '\\') {
        inString = false;
        result += '"'; // Always use double quotes
      } else if (char === '"' && stringChar === "'") {
        // Escape double quotes inside single-quoted strings
        result += '\\"';
      } else {
        result += char;
      }
    }
    i++;
  }
  
  return result;
}

/**
 * Parse a batch JSON response from the AI service
 * 
 * This function handles:
 * - Markdown code blocks (```json ... ```)
 * - Trailing commas
 * - Unescaped characters
 * - Extraction of JSON array from surrounding text
 * 
 * @param response - The raw AI response string
 * @returns The parsed JSON array
 * @throws BatchJsonParseError if parsing fails
 * 
 * Requirements: 7.1, 7.2, 7.3
 */
export function parseBatchJson(response: string): unknown[] {
  if (!response || typeof response !== 'string') {
    throw new BatchJsonParseError(
      'Response is empty or not a string',
      response || '',
      []
    );
  }

  const parseAttempts: string[] = [];

  // Step 1: Extract JSON from response (handle markdown code blocks)
  const extracted = extractJsonFromResponse(response);
  
  if (!extracted) {
    throw new BatchJsonParseError(
      'Could not extract JSON content from response',
      response,
      ['Extraction returned empty string']
    );
  }

  // Step 2: Try parsing the extracted JSON directly
  try {
    const parsed = JSON.parse(extracted);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // If it's not an array, wrap it (single question response)
    if (typeof parsed === 'object' && parsed !== null) {
      return [parsed];
    }
    throw new Error('Parsed result is not an array or object');
  } catch (e) {
    parseAttempts.push(`Direct parse failed: ${(e as Error).message}`);
  }

  // Step 3: Try with sanitization (trailing commas, escape sequences)
  const sanitized = sanitizeJson(extracted);
  try {
    const parsed = JSON.parse(sanitized);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return [parsed];
    }
    throw new Error('Parsed result is not an array or object');
  } catch (e) {
    parseAttempts.push(`Sanitized parse failed: ${(e as Error).message}`);
  }

  // Step 4: Try fixing single quotes (common AI mistake)
  const fixedQuotes = fixSingleQuotes(sanitized);
  try {
    const parsed = JSON.parse(fixedQuotes);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return [parsed];
    }
    throw new Error('Parsed result is not an array or object');
  } catch (e) {
    parseAttempts.push(`Single quote fix failed: ${(e as Error).message}`);
  }

  // Step 5: Try more aggressive extraction - find array boundaries
  try {
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const arrayContent = sanitizeJson(arrayMatch[0]);
      const parsed = JSON.parse(arrayContent);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    parseAttempts.push(`Array extraction failed: ${(e as Error).message}`);
  }

  // All attempts failed
  throw new BatchJsonParseError(
    'Failed to parse JSON array from AI response after multiple attempts',
    response,
    parseAttempts
  );
}

/**
 * Serialize a question array to JSON string
 * Used for round-trip testing
 * 
 * @param questions - The array of questions to serialize
 * @returns The JSON string representation
 */
export function serializeBatchJson(questions: unknown[]): string {
  return JSON.stringify(questions, null, 2);
}

// Export singleton-style functions for consistency with other services
export const batchJsonParser = {
  parse: parseBatchJson,
  serialize: serializeBatchJson,
};
