import type { Flashcard } from "@shared/schema";

/**
 * Convert flashcards to CSV format
 */
export function convertToCSV(flashcards: Flashcard[]): string {
  // CSV header
  const headers = ['ID', 'Question', 'Answer', 'Category', 'Difficulty', 'Tags', 'Ease Factor', 'Repetition Interval', 'Last Reviewed', 'Next Review Date', 'Created At'];
  
  // CSV rows
  const rows = flashcards.map(card => {
    const tags = Array.isArray(card.tags) ? card.tags.join('; ') : '';
    const lastReviewed = card.lastReviewed ? new Date(card.lastReviewed).toISOString() : '';
    const nextReviewDate = card.nextReviewDate ? new Date(card.nextReviewDate).toISOString() : '';
    const createdAt = card.createdAt ? new Date(card.createdAt).toISOString() : '';
    
    return [
      card.id,
      escapeCSV(card.question),
      escapeCSV(card.answer),
      escapeCSV(card.category || ''),
      card.difficulty || 'medium',
      escapeCSV(tags),
      card.easeFactor || 250,
      card.repetitionInterval || 1,
      lastReviewed,
      nextReviewDate,
      createdAt
    ];
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * Escape CSV field values
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  
  // If value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

/**
 * Convert flashcards to Anki deck format (TSV)
 * Anki uses tab-separated values with front and back fields
 */
export function convertToAnki(flashcards: Flashcard[]): string {
  // Anki format: Front \t Back \t Tags
  const rows = flashcards.map(card => {
    const tags = Array.isArray(card.tags) ? card.tags.join(' ') : '';
    const category = card.category ? card.category : '';
    const allTags = [category, tags].filter(Boolean).join(' ');
    
    // Escape tabs and newlines in content
    const front = escapeAnki(card.question);
    const back = escapeAnki(card.answer);
    
    return `${front}\t${back}\t${allTags}`;
  });
  
  return rows.join('\n');
}

/**
 * Escape Anki field values
 */
function escapeAnki(value: string): string {
  if (!value) return '';
  
  // Replace tabs with spaces and normalize newlines
  return value
    .replace(/\t/g, ' ')
    .replace(/\r\n/g, '<br>')
    .replace(/\n/g, '<br>');
}

/**
 * Convert flashcards to JSON format
 */
export function convertToJSON(flashcards: Flashcard[]): string {
  // Create a clean export format
  const exportData = flashcards.map(card => ({
    id: card.id,
    question: card.question,
    answer: card.answer,
    questionImage: card.questionImage || null,
    answerImage: card.answerImage || null,
    category: card.category || null,
    difficulty: card.difficulty || 'medium',
    tags: card.tags || [],
    easeFactor: card.easeFactor || 250,
    repetitionInterval: card.repetitionInterval || 1,
    lastReviewed: card.lastReviewed || null,
    nextReviewDate: card.nextReviewDate || null,
    createdAt: card.createdAt || null,
  }));
  
  return JSON.stringify(exportData, null, 2);
}
