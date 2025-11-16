/**
 * Chat Conversation Summarization Utilities
 * Provides functions to summarize long conversations and extract topics
 */

import type { ChatMessage } from "@shared/schema";

/**
 * Check if a conversation needs summarization
 * @param messages - Array of chat messages
 * @param threshold - Number of messages before summarization is needed (default: 20)
 * @returns True if conversation should be summarized
 */
export function shouldSummarizeConversation(messages: ChatMessage[], threshold: number = 20): boolean {
  return messages.length >= threshold;
}

/**
 * Extract the main topic from conversation messages
 * @param messages - Array of chat messages
 * @returns Extracted topic or null
 */
export function extractConversationTopic(messages: ChatMessage[]): string | null {
  if (messages.length === 0) return null;
  
  // Get first few user messages to determine topic
  const userMessages = messages
    .filter(msg => msg.role === 'user')
    .slice(0, 3)
    .map(msg => msg.content);
  
  if (userMessages.length === 0) return null;
  
  // Simple topic extraction: use first message or combine first few
  const combinedText = userMessages.join(' ');
  
  // Extract first sentence or first 50 characters as topic
  const firstSentence = combinedText.split(/[.!?]/)[0];
  const topic = firstSentence.length > 50 
    ? firstSentence.substring(0, 50) + '...' 
    : firstSentence;
  
  return topic.trim();
}

/**
 * Create a summary prompt for the AI to summarize a conversation
 * @param messages - Array of chat messages to summarize
 * @returns Prompt for AI summarization
 */
export function createSummarizationPrompt(messages: ChatMessage[]): string {
  const conversationText = messages
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');
  
  return `Please provide a concise summary of the following conversation in 2-3 sentences. Focus on the main topics discussed and key points covered:\n\n${conversationText}\n\nSummary:`;
}

/**
 * Truncate old messages and keep recent ones with a summary
 * @param messages - Array of chat messages
 * @param keepRecent - Number of recent messages to keep (default: 10)
 * @param summary - Summary of older messages
 * @returns Truncated messages with summary
 */
export function truncateWithSummary(
  messages: ChatMessage[],
  keepRecent: number = 10,
  summary: string
): ChatMessage[] {
  if (messages.length <= keepRecent) {
    return messages;
  }
  
  // Keep the most recent messages
  const recentMessages = messages.slice(-keepRecent);
  
  // Create a summary message to represent older conversation
  const summaryMessage: ChatMessage = {
    role: 'system',
    content: `[Previous conversation summary: ${summary}]`,
    timestamp: messages[0].timestamp || new Date(),
  };
  
  return [summaryMessage, ...recentMessages];
}

/**
 * Calculate conversation statistics
 * @param messages - Array of chat messages
 * @returns Statistics about the conversation
 */
export function getConversationStats(messages: ChatMessage[]): {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  averageMessageLength: number;
  estimatedDuration: string;
} {
  const userMessages = messages.filter(msg => msg.role === 'user').length;
  const assistantMessages = messages.filter(msg => msg.role === 'assistant').length;
  
  const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  const averageMessageLength = messages.length > 0 ? Math.round(totalLength / messages.length) : 0;
  
  // Estimate duration based on message count (assume ~2 minutes per exchange)
  const exchanges = Math.min(userMessages, assistantMessages);
  const estimatedMinutes = exchanges * 2;
  const estimatedDuration = estimatedMinutes < 60 
    ? `${estimatedMinutes} min` 
    : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`;
  
  return {
    totalMessages: messages.length,
    userMessages,
    assistantMessages,
    averageMessageLength,
    estimatedDuration,
  };
}

/**
 * Extract keywords from conversation
 * @param messages - Array of chat messages
 * @param limit - Maximum number of keywords to extract (default: 10)
 * @returns Array of keywords
 */
export function extractKeywords(messages: ChatMessage[], limit: number = 10): string[] {
  // Combine all message content
  const allText = messages
    .map(msg => msg.content)
    .join(' ')
    .toLowerCase();
  
  // Remove common words
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i',
    'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when',
    'where', 'why', 'how', 'please', 'thank', 'thanks', 'hello', 'hi', 'yes', 'no'
  ]);
  
  // Extract words (alphanumeric only, length > 3)
  const words = allText.match(/\b[a-z]{4,}\b/g) || [];
  
  // Count word frequency
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    if (!commonWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  });
  
  // Sort by frequency and return top keywords
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}
