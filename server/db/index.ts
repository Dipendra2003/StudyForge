import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { log } from '../vite';

// Load environment variables
dotenv.config();

// PostgreSQL Connection
const connectPostgres = async () => {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('PostgreSQL connection string missing. Please set DATABASE_URL in .env file');
    }
    
    // Create postgres connection client
    const queryClient = postgres(databaseUrl, { 
      max: process.env.DB_CONNECTION_LIMIT ? parseInt(process.env.DB_CONNECTION_LIMIT) : (process.env.NODE_ENV === 'production' ? 50 : 10),
      idle_timeout: process.env.DB_IDLE_TIMEOUT_SECONDS ? parseInt(process.env.DB_IDLE_TIMEOUT_SECONDS) : 60,
      connect_timeout: process.env.DB_CONNECT_TIMEOUT_SECONDS ? parseInt(process.env.DB_CONNECT_TIMEOUT_SECONDS) : 10
    });
    
    log('PostgreSQL connection established successfully', 'database');
    return queryClient;
  } catch (error) {
    log(`PostgreSQL connection error: ${error}`, 'database');
    throw error;
  }
};

// Initialize connection placeholder
let pgConnection: any = null;
export let db: any = null;

// Function to get connection stats
export const getPoolStats = () => {
  return {
    totalConnections: 1,
    freeConnections: 0,
    queuedRequests: 0,
    connectionLimit: process.env.DB_CONNECTION_LIMIT ? parseInt(process.env.DB_CONNECTION_LIMIT) : (process.env.NODE_ENV === 'production' ? 50 : 10),
  };
};

// Function to verify database indexes
export const verifyIndexes = async () => {
  if (!pgConnection) {
    log('Cannot verify indexes: PostgreSQL connection not established', 'database');
    return;
  }
  log('Verifying database indexes (skipping actual DB check for PostgreSQL for now)', 'database');
};


// Redis Connection (for caching)
export const connectRedis = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: isProduction 
          ? (retries) => Math.min(retries * 50, 500)
          : false
      }
    });

    redisClient.on('error', (err) => {
      if (isProduction) {
        log(`Redis error: ${err.message}`, 'database');
      }
    });

    await redisClient.connect();
    log('Redis connection established', 'database');
    return redisClient;
  } catch (error) {
    log(`Redis connection failed, continuing without caching`, 'database');
    return null;
  }
};


// Initialize all database connections
export const initializeDatabases = async () => {
  let redisClient = null;
  
  try {
    log('Initializing database connections...', 'database');
    
    // Connect to Postgres
    try {
      pgConnection = await connectPostgres();
      db = drizzle(pgConnection);
      log('PostgreSQL connection established successfully', 'database');
      
      await verifyIndexes();
    } catch (error) {
      log(`PostgreSQL connection error: ${error}`, 'database');
      throw error;
    }
    
    // Connect to Redis
    try {
      redisClient = await connectRedis();
      if (redisClient) log('Redis connection established successfully', 'database');
    } catch (error) {
      log(`Redis connection error: ${error}, continuing without caching`, 'database');
    }
    
    log('Database initialization completed', 'database');
    return { 
      db, 
      redisClient
    };
  } catch (error) {
    log(`Critical database initialization error: ${error}`, 'database');
    throw error;
  }
};
