import mongoose, { Document, Schema } from 'mongoose';

// Base interface for MongoDB documents
interface BaseDocument extends Document {
  createdAt: Date;
  updatedAt: Date;
}

// Chat Message schema
interface ChatMessageDocument {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// Chat History interface
export interface ChatHistoryDocument extends BaseDocument {
  userId: number; // Reference to SQL user ID
  sessionId: string;
  subject: string | null;
  messages: ChatMessageDocument[];
  lastUpdated: Date;
}

// PDF Summary interface
export interface SummaryDocument extends BaseDocument {
  userId: number; // Reference to SQL user ID
  documentId: number; // Reference to SQL document ID
  originalText: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
}

// Code Snippet interface
export interface CodeSnippetDocument extends BaseDocument {
  userId: number; // Reference to SQL user ID
  title: string;
  problem: string;
  code: string;
  language: string;
  explanation: string;
  tags: string[];
}

// AI Response Caching interface (with TTL)
export interface CachedResponseDocument extends BaseDocument {
  query: string;
  response: string;
  metadata: Record<string, any>;
  ttl: Date; // Time to live
}

// Schema definitions
const ChatMessageSchema = new Schema<ChatMessageDocument>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const ChatHistorySchema = new Schema<ChatHistoryDocument>({
  userId: { type: Number, required: true, index: true },
  sessionId: { type: String, required: true },
  subject: { type: String, default: null },
  messages: [ChatMessageSchema],
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for faster retrieval by userId
ChatHistorySchema.index({ userId: 1, lastUpdated: -1 });

const SummarySchema = new Schema<SummaryDocument>({
  userId: { type: Number, required: true, index: true },
  documentId: { type: Number, required: true, index: true },
  originalText: { type: String, required: true },
  summary: { type: String, required: true },
  keyPoints: [String],
  keywords: [String]
}, { timestamps: true });

// Compound index for faster document-specific queries
SummarySchema.index({ userId: 1, documentId: 1 });

const CodeSnippetSchema = new Schema<CodeSnippetDocument>({
  userId: { type: Number, required: true, index: true },
  title: { type: String, required: true },
  problem: { type: String, required: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  explanation: { type: String, required: true },
  tags: [String]
}, { timestamps: true });

// Index for language-specific queries
CodeSnippetSchema.index({ userId: 1, language: 1 });
// Text index for full-text search
CodeSnippetSchema.index({ title: 'text', problem: 'text', code: 'text' });

const CachedResponseSchema = new Schema<CachedResponseDocument>({
  query: { type: String, required: true, index: true },
  response: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ttl: { type: Date, required: true, expires: 0 } // Document will be automatically removed when TTL expires
}, { timestamps: true });

// Models
export const ChatHistory = mongoose.model<ChatHistoryDocument>('ChatHistory', ChatHistorySchema);
export const Summary = mongoose.model<SummaryDocument>('Summary', SummarySchema);
export const CodeSnippet = mongoose.model<CodeSnippetDocument>('CodeSnippet', CodeSnippetSchema);
export const CachedResponse = mongoose.model<CachedResponseDocument>('CachedResponse', CachedResponseSchema);