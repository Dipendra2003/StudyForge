/**
 * Format text by removing markdown and improving readability
 */
export function formatFlashcardText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove markdown bold (**text**)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove markdown italic (*text*)
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove markdown headers (###, ##, #)
    .replace(/^#{1,6}\s+/gm, '')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim();
}

/**
 * Format text with proper line breaks and structure
 */
export function formatTextWithLineBreaks(text: string): string[] {
  if (!text) return [];
  
  // First clean the text
  const cleanText = formatFlashcardText(text);
  
  // Split by common delimiters
  const parts = cleanText
    .split(/(?:\. (?=[A-Z])|\n|• |· |- (?=[A-Z]))/)
    .filter(part => part.trim().length > 0);
  
  return parts.map(part => 
    part.trim().endsWith('.') ? part.trim() : part.trim() + '.'
  );
}

/**
 * Parse and format structured content (lists, sections, etc.)
 */
export function parseStructuredContent(text: string): {
  type: 'paragraph' | 'list' | 'heading';
  content: string;
}[] {
  if (!text) return [];
  
  const cleanText = formatFlashcardText(text);
  const lines = cleanText.split(/\n+/).filter(line => line.trim());
  
  return lines.map(line => {
    const trimmed = line.trim();
    
    // Check if it's a list item
    if (/^[•·\-*]\s/.test(trimmed)) {
      return {
        type: 'list' as const,
        content: trimmed.replace(/^[•·\-*]\s+/, ''),
      };
    }
    
    // Check if it's a heading (all caps or ends with colon)
    if (trimmed === trimmed.toUpperCase() || trimmed.endsWith(':')) {
      return {
        type: 'heading' as const,
        content: trimmed,
      };
    }
    
    // Default to paragraph
    return {
      type: 'paragraph' as const,
      content: trimmed,
    };
  });
}
