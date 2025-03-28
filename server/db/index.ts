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
const connectPostgres = async () => {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const client = postgres(connectionString, { max: 10 });
    log('PostgreSQL connection established', 'database');
    return client;
  } catch (error) {
    log(`PostgreSQL connection error: ${error}`, 'database');
    throw error;
  }
};

// Initialize connection placeholder - will be set in initializeDatabases
let pgConnection: any = null;
export let db: any = null;

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
  let mongoConnection = null;
  let redisClient = null;
  
  try {
    log('Initializing database connections...', 'database');
    
    // Connect to PostgreSQL for structured data (required)
    try {
      pgConnection = await connectPostgres();
      db = drizzle(pgConnection);
      log('PostgreSQL connection established successfully', 'database');
    } catch (error) {
      log(`PostgreSQL connection error: ${error}`, 'database');
      throw error; // PostgreSQL is required, so we rethrow
    }
    
    // Connect to MongoDB for unstructured data (optional)
    try {
      mongoConnection = await connectMongoDB();
      log('MongoDB connection established successfully', 'database');
    } catch (error) {
      log(`MongoDB connection error: ${error}, continuing with limited functionality`, 'database');
      // We don't rethrow as MongoDB is optional
    }
    
    // Connect to Redis (for caching) (optional)
    try {
      redisClient = await connectRedis();
      log('Redis connection established successfully', 'database');
    } catch (error) {
      log(`Redis connection error: ${error}, continuing without caching`, 'database');
      // We don't rethrow as Redis is optional
    }
    
    log('Database initialization completed', 'database');
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
    log(`Critical database initialization error: ${error}`, 'database');
    throw error;
  }
};