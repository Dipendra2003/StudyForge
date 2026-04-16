/**
 * CSV Export Utility
 * Provides functions to export data to CSV format and trigger browser download
 */

/**
 * Convert an array of objects to CSV format
 */
export function convertToCSV(data: any[], headers: string[]): string {
  if (data.length === 0) {
    return headers.join(',') + '\n';
  }

  // Create header row
  const headerRow = headers.join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      // Convert to string
      let stringValue = String(value);
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
      }
      
      return stringValue;
    }).join(',');
  });

  return headerRow + '\n' + dataRows.join('\n');
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for Excel UTF-8 support
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Format date for CSV export
 */
export function formatDateForCSV(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return '';
  }
}

/**
 * Format datetime for CSV export
 */
export function formatDateTimeForCSV(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    return d.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS format
  } catch {
    return '';
  }
}

/**
 * Export users to CSV
 */
export function exportUsersToCSV(users: any[], filename: string = 'users-export.csv'): void {
  const headers = ['id', 'username', 'email', 'role', 'status', 'createdAt'];
  
  const formattedData = users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.isActive ? 'Active' : 'Suspended',
    createdAt: formatDateForCSV(user.createdAt),
  }));
  
  const csv = convertToCSV(formattedData, headers);
  downloadCSV(csv, filename);
}

/**
 * Export quizzes to CSV
 */
export function exportQuizzesToCSV(quizzes: any[], filename: string = 'quizzes-export.csv'): void {
  const headers = ['id', 'title', 'creator', 'category', 'totalQuestions', 'difficulty', 'usageCount', 'createdAt'];
  
  const formattedData = quizzes.map(quiz => ({
    id: quiz.id,
    title: quiz.title || '',
    creator: quiz.creatorUsername || '',
    category: quiz.category || '',
    totalQuestions: quiz.totalQuestions || 0,
    difficulty: quiz.difficulty || '',
    usageCount: quiz.usageCount || 0,
    createdAt: formatDateForCSV(quiz.createdAt),
  }));
  
  const csv = convertToCSV(formattedData, headers);
  downloadCSV(csv, filename);
}

/**
 * Export flashcards to CSV
 */
export function exportFlashcardsToCSV(flashcards: any[], filename: string = 'flashcards-export.csv'): void {
  const headers = ['id', 'question', 'answer', 'creator', 'category', 'difficulty', 'createdAt'];
  
  const formattedData = flashcards.map(card => ({
    id: card.id,
    question: card.question || '',
    answer: card.answer || '',
    creator: card.creatorUsername || '',
    category: card.category || '',
    difficulty: card.difficulty || '',
    createdAt: formatDateForCSV(card.createdAt),
  }));
  
  const csv = convertToCSV(formattedData, headers);
  downloadCSV(csv, filename);
}

/**
 * Export documents to CSV
 */
export function exportDocumentsToCSV(documents: any[], filename: string = 'documents-export.csv'): void {
  const headers = ['id', 'title', 'creator', 'category', 'fileType', 'status', 'createdAt'];
  
  const formattedData = documents.map(doc => ({
    id: doc.id,
    title: doc.title || '',
    creator: doc.creatorUsername || '',
    category: doc.category || '',
    fileType: doc.fileType || '',
    status: doc.status || '',
    createdAt: formatDateForCSV(doc.createdAt),
  }));
  
  const csv = convertToCSV(formattedData, headers);
  downloadCSV(csv, filename);
}

/**
 * Export questions to CSV
 */
export function exportQuestionsToCSV(questions: any[], filename: string = 'questions-export.csv'): void {
  const headers = ['id', 'question', 'type', 'creator', 'category', 'difficulty', 'usageCount', 'createdAt'];
  
  const formattedData = questions.map(q => ({
    id: q.id,
    question: q.question || '',
    type: q.type || '',
    creator: q.creatorUsername || '',
    category: q.category || '',
    difficulty: q.difficulty || '',
    usageCount: q.usageCount || 0,
    createdAt: formatDateForCSV(q.createdAt),
  }));
  
  const csv = convertToCSV(formattedData, headers);
  downloadCSV(csv, filename);
}

/**
 * Export analytics data to CSV
 */
export function exportAnalyticsToCSV(data: any, filename: string = 'analytics-export.csv'): void {
  const headers = ['metric', 'value'];
  
  const formattedData = Object.entries(data).map(([key, value]) => ({
    metric: key,
    value: String(value),
  }));
  
  const csv = convertToCSV(formattedData, headers);
  downloadCSV(csv, filename);
}

/**
 * Export logs to CSV
 */
export function exportLogsToCSV(logs: any[], filename: string = 'logs-export.csv'): void {
  const headers = ['id', 'timestamp', 'userId', 'username', 'action', 'status', 'ipAddress', 'details'];
  
  const formattedData = logs.map(log => ({
    id: log.id,
    timestamp: formatDateTimeForCSV(log.createdAt),
    userId: log.userId || '',
    username: log.username || '',
    action: log.action || '',
    status: log.status || '',
    ipAddress: log.ipAddress || '',
    details: log.details ? JSON.stringify(log.details) : '',
  }));
  
  const csv = convertToCSV(formattedData, headers);
  downloadCSV(csv, filename);
}
