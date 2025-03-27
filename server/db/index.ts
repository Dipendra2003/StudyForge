import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { log } from '../vite';

// Import MongoDB models
import { 
  ChatHistory as ChatHistoryModel, 
  Summary as SummaryModel, 
  CodeSnippet as CodeSnippetModel,
  CachedResponse as CachedResponseModel,
  ChatHistoryDocument,
  SummaryDocument, 
  CodeSnippetDocument,
  CachedResponseDocument
} from './mongodb/models';

// Load environment variables
dotenv.config();

// PostgreSQL Connection (for structured data)
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString as string);
export const db = drizzle(client);

// MongoDB Connection (for unstructured AI-generated content)
export const connectMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jadoo_unstructured';
    await mongoose.connect(mongoURI);
    log('MongoDB connection established', 'database');
    return mongoose.connection;
  } catch (error) {
    log(`MongoDB connection error: ${error}`, 'database');
    throw error;
  }
};

// Redis Connection (for caching)
export const connectRedis = async () => {
  try {
    const redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      log(`Redis client error: ${err}`, 'database');
    });

    await redisClient.connect();
    log('Redis connection established', 'database');
    return redisClient;
  } catch (error) {
    log(`Redis connection error: ${error}`, 'database');
    throw error;
  }
};

// Export MongoDB models for use in the application
export {
  ChatHistoryModel,
  SummaryModel,
  CodeSnippetModel,
  CachedResponseModel,
  ChatHistoryDocument,
  SummaryDocument,
  CodeSnippetDocument,
  CachedResponseDocument
};

// Initialize all database connections
export const initializeDatabases = async () => {
  try {
    log('Initializing database connections...', 'database');
    
    // PostgreSQL is already initialized with drizzle
    
    // Connect to MongoDB
    await connectMongoDB();
    
    // Connect to Redis (for caching)
    const redisClient = await connectRedis();
    
    log('All database connections established successfully', 'database');
    return { 
      db, 
      mongoose, 
      redisClient,
      models: {
        ChatHistoryModel,
        SummaryModel,
        CodeSnippetModel,
        CachedResponseModel
      }
    };
  } catch (error) {
    log(`Database initialization error: ${error}`, 'database');
    throw error;
  }
};