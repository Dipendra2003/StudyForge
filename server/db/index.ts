import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { log } from '../vite';

// Load environment variables
dotenv.config();

// MySQL Connection (for all data)
const connectMySQL = async () => {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const connection = await mysql.createConnection(connectionString);
    log('MySQL connection established', 'database');
    return connection;
  } catch (error) {
    log(`MySQL connection error: ${error}`, 'database');
    throw error;
  }
};

// Initialize connection placeholder - will be set in initializeDatabases
let mysqlConnection: any = null;
export let db: any = null;


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


// Initialize all database connections
export const initializeDatabases = async () => {
  let redisClient = null;
  
  try {
    log('Initializing database connections...', 'database');
    
    // Connect to MySQL for all data (required)
    try {
      mysqlConnection = await connectMySQL();
      db = drizzle(mysqlConnection);
      log('MySQL connection established successfully', 'database');
    } catch (error) {
      log(`MySQL connection error: ${error}`, 'database');
      throw error; // MySQL is required, so we rethrow
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
      redisClient
    };
  } catch (error) {
    log(`Critical database initialization error: ${error}`, 'database');
    throw error;
  }
};