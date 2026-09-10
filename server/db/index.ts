import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from 'redis';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

const log = (message: string, source = "database") => {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
};

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
      idle_timeout: process.env.DB_IDLE_TIMEOUT_SECONDS ? parseInt(process.env.DB_IDLE_TIMEOUT_SECONDS) : 300,
      connect_timeout: process.env.DB_CONNECT_TIMEOUT_SECONDS ? parseInt(process.env.DB_CONNECT_TIMEOUT_SECONDS) : 30,
      onnotice: () => {} // Suppress noisy postgres schema verification notices
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

// Function to ensure critical admin and monitoring database schema tables exist
export const ensureDatabaseSchema = async (client: any) => {
  if (!client) {
    log('Cannot ensure database schema: PostgreSQL client not established', 'database');
    return;
  }
  try {
    log('Verifying and ensuring critical database tables exist...', 'database');

    await client`
      CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
        "id" serial PRIMARY KEY,
        "user_id" integer,
        "endpoint" varchar(100) NOT NULL,
        "model" varchar(100) NOT NULL,
        "tokens_used" integer DEFAULT 0 NOT NULL,
        "duration_ms" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    await client`CREATE INDEX IF NOT EXISTS "ai_usage_logs_user_id_idx" ON "ai_usage_logs" ("user_id")`;
    await client`CREATE INDEX IF NOT EXISTS "ai_usage_logs_created_at_idx" ON "ai_usage_logs" ("created_at")`;

    await client`
      CREATE TABLE IF NOT EXISTS "content_flags" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "content_type" varchar(50) NOT NULL,
        "content_id" integer NOT NULL,
        "reason" varchar(255) NOT NULL,
        "status" varchar(20) DEFAULT 'pending' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    await client`CREATE INDEX IF NOT EXISTS "content_flags_type_idx" ON "content_flags" ("content_type")`;
    await client`CREATE INDEX IF NOT EXISTS "content_flags_id_idx" ON "content_flags" ("content_id")`;
    await client`CREATE INDEX IF NOT EXISTS "content_flags_status_idx" ON "content_flags" ("status")`;

    await client`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" serial PRIMARY KEY,
        "ai_model" varchar(100) DEFAULT 'gemini-3.1-flash-lite-preview' NOT NULL,
        "fallback_ai_model" varchar(100) DEFAULT 'gemini-2.5-flash' NOT NULL,
        "token_budget" integer DEFAULT 500000 NOT NULL,
        "auto_quarantine" boolean DEFAULT true NOT NULL,
        "toxicity_threshold" varchar(20) DEFAULT '0.85' NOT NULL,
        "maintenance_mode" boolean DEFAULT false NOT NULL,
        "jwt_strict_rotation" boolean DEFAULT true NOT NULL,
        "sender_email" varchar(100) DEFAULT 'notifications@studyforge.edu' NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;

    log('Critical database tables verified and initialized successfully.', 'database');
  } catch (error) {
    log(`Database schema auto-creation error: ${error}`, 'database');
  }
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
export let redisClient: any = null;

export const isRedisAvailable = (): boolean => {
  try {
    return !!(redisClient && redisClient.isOpen);
  } catch {
    return false;
  }
};

export const connectRedis = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const client = createClient({
      url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: isProduction 
          ? (retries) => {
              if (retries > 3) return new Error('Max retries reached, failing over to in-memory cache');
              return Math.min(retries * 50, 500);
            }
          : false
      }
    });

    client.on('error', (err) => {
      if (isProduction) {
        log(`Redis error: ${err.message}`, 'database');
      }
    });

    await client.connect();
    log('Redis connection established', 'database');
    redisClient = client;
    return client;
  } catch (error) {
    log(`Redis connection failed, continuing without caching`, 'database');
    redisClient = null;
    return null;
  }
};


// Initialize all database connections
export const initializeDatabases = async () => {
  try {
    log('Initializing database connections...', 'database');
    
    // Connect to Postgres
    try {
      pgConnection = await connectPostgres();
      db = drizzle(pgConnection);
      log('PostgreSQL connection established successfully', 'database');
      
      await ensureDatabaseSchema(pgConnection);
      await verifyIndexes();
    } catch (error) {
      log(`PostgreSQL connection error: ${error}`, 'database');
      throw error;
    }
    
    // Connect to Redis
    try {
      const client = await connectRedis();
      if (client) log('Redis connection established successfully', 'database');
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
