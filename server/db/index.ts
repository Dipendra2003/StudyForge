import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { log } from '../vite';

// Load environment variables
dotenv.config();

// MySQL Connection Pool (for all data)
const connectMySQL = async () => {
  try {
    const mysqlHost = process.env.MYSQL_HOST;
    const mysqlPort = process.env.MYSQL_PORT;
    const mysqlUsername = process.env.MYSQL_USERNAME;
    const mysqlPassword = process.env.MYSQL_PASSWORD;
    const mysqlDatabase = process.env.MYSQL_DATABASE;

    if (!mysqlHost || !mysqlPort || !mysqlUsername || !mysqlPassword || !mysqlDatabase) {
      throw new Error('MySQL credentials missing. Please set MYSQL_HOST, MYSQL_PORT, MYSQL_USERNAME, MYSQL_PASSWORD, and MYSQL_DATABASE in .env file');
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Create connection pool with optimized settings
    const poolConfig: any = {
      host: mysqlHost,
      port: parseInt(mysqlPort),
      user: mysqlUsername,
      password: mysqlPassword,
      database: mysqlDatabase,
      // Connection pool settings - adjusted based on environment
      connectionLimit: isProduction ? 100 : 50, // More connections in production
      waitForConnections: true, // Queue requests when no connections available
      queueLimit: isProduction ? 100 : 0, // Limit queue in production to prevent memory issues
      enableKeepAlive: true, // Keep connections alive
      keepAliveInitialDelay: 0, // Start keep-alive immediately
      // Connection timeout settings
      connectTimeout: 10000, // 10 seconds to establish connection
      // Performance optimizations
      multipleStatements: false, // Security: prevent SQL injection
      namedPlaceholders: true, // Better query performance
      decimalNumbers: true, // Parse decimals as numbers
      bigNumberStrings: false, // Better number handling
      dateStrings: true, // Return dates as strings to avoid timezone conversion
      timezone: 'Z', // Use UTC timezone
    };

    // Add SSL configuration for production if enabled
    if (isProduction && process.env.MYSQL_SSL === 'true') {
      poolConfig.ssl = {
        rejectUnauthorized: true,
      };
    }

    const pool = mysql.createPool(poolConfig);
    
    // Test the pool connection
    const connection = await pool.getConnection();
    log('MySQL connection pool established successfully', 'database');
    log(`Pool configuration: connectionLimit=${pool.pool.config.connectionLimit}, queueLimit=${pool.pool.config.queueLimit}`, 'database');
    connection.release();
    
    return pool;
  } catch (error) {
    log(`MySQL connection pool error: ${error}`, 'database');
    throw error;
  }
};

// Initialize connection placeholder - will be set in initializeDatabases
let mysqlConnection: any = null;
export let db: any = null;

// Function to get connection pool stats
export const getPoolStats = () => {
  if (!mysqlConnection || !mysqlConnection.pool) {
    return null;
  }
  
  const pool = mysqlConnection.pool;
  return {
    totalConnections: pool._allConnections.length,
    freeConnections: pool._freeConnections.length,
    queuedRequests: pool._connectionQueue.length,
    connectionLimit: pool.config.connectionLimit,
  };
};

// Function to verify database indexes
export const verifyIndexes = async () => {
  if (!mysqlConnection) {
    log('Cannot verify indexes: MySQL connection not established', 'database');
    return;
  }

  try {
    const databaseName = process.env.MYSQL_DATABASE;
    
    // Query to get all indexes from the database
    const [indexes] = await mysqlConnection.query(`
      SELECT 
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `, [databaseName]);

    // Expected indexes based on schema.ts
    // Note: unique constraints on username/email are treated as indexes by MySQL
    const expectedIndexes = {
      users: ['users_username_idx', 'users_email_idx', 'users_verification_token_idx', 'users_reset_token_idx'],
      refresh_tokens: ['refresh_tokens_user_id_idx', 'refresh_tokens_token_idx', 'refresh_tokens_expires_at_idx'],
      email_logs: ['email_logs_user_id_idx', 'email_logs_email_type_idx', 'email_logs_sent_at_idx'],
      security_audit_logs: ['security_audit_logs_user_id_idx', 'security_audit_logs_action_idx', 'security_audit_logs_created_at_idx'],
      documents: ['doc_user_id_idx', 'doc_title_idx', 'doc_status_idx'],
      flashcards: ['fc_user_id_idx', 'fc_doc_id_idx', 'fc_review_date_idx', 'fc_category_idx'],
      flashcard_decks: ['fd_user_id_idx'],
      deck_flashcards: ['df_deck_id_idx', 'df_flashcard_id_idx'],
      mcqs: ['mcq_user_id_idx', 'mcq_doc_id_idx', 'mcq_difficulty_idx', 'mcq_category_idx'],
      questions: ['q_user_id_idx', 'q_type_idx', 'q_category_idx', 'q_difficulty_idx', 'q_created_at_idx'],
      quiz_sessions: ['qs_user_id_idx', 'qs_session_id_idx', 'qs_category_idx', 'qs_difficulty_idx', 'qs_created_at_idx'],
      user_quiz_stats: ['uqs_user_id_idx'],
      quiz_attempts: ['qa_user_id_idx', 'qa_created_at_idx'],
      question_attempts: ['qst_quiz_id_idx', 'qst_question_id_idx'],
      study_plans: ['sp_user_id_idx', 'sp_status_idx', 'sp_date_range_idx'],
      study_sessions: ['ss_user_id_idx', 'ss_plan_id_idx', 'ss_date_idx'],
      achievements: ['ach_user_id_idx', 'ach_badge_idx'],
      user_stats: ['us_user_id_idx', 'us_level_idx', 'us_streak_idx'],
      chat_history: ['chat_user_id_idx', 'chat_session_id_idx', 'chat_last_updated_idx'],
      summaries: ['sum_user_id_idx', 'sum_doc_id_idx'],
      code_snippets: ['cs_user_id_idx', 'cs_language_idx', 'cs_title_idx'],
      cached_responses: ['cr_query_idx', 'cr_ttl_idx'],
      feedback: ['fb_user_id_idx', 'fb_message_id_idx', 'fb_type_idx'],
      shareable_quiz_links: ['sql_link_id_idx', 'sql_creator_idx', 'sql_expires_at_idx'],
      shared_quiz_attempts: ['sqa_link_idx', 'sqa_user_idx'],
      saved_quizzes: ['sq_user_id_idx', 'sq_category_idx', 'sq_saved_at_idx'],
      favorite_quizzes: ['fq_user_id_idx', 'fq_category_idx', 'fq_favorited_at_idx'],
      user_points: ['up_user_id_idx', 'up_source_idx', 'up_created_at_idx'],
      quiz_of_the_day_completions: ['qotd_user_id_idx', 'qotd_date_idx', 'qotd_quiz_id_idx'],
    };

    log('Verifying database indexes...', 'database');
    
    // Group indexes by table
    const indexesByTable: Record<string, string[]> = {};
    (indexes as any[]).forEach((idx: any) => {
      if (!indexesByTable[idx.TABLE_NAME]) {
        indexesByTable[idx.TABLE_NAME] = [];
      }
      if (!indexesByTable[idx.TABLE_NAME].includes(idx.INDEX_NAME)) {
        indexesByTable[idx.TABLE_NAME].push(idx.INDEX_NAME);
      }
    });

    // Check for missing indexes
    let allIndexesPresent = true;
    for (const [table, expectedIdxs] of Object.entries(expectedIndexes)) {
      const actualIdxs = indexesByTable[table] || [];
      const missingIdxs = expectedIdxs.filter(idx => !actualIdxs.includes(idx));
      
      if (missingIdxs.length > 0) {
        log(`⚠️  Table '${table}' is missing indexes: ${missingIdxs.join(', ')}`, 'database');
        allIndexesPresent = false;
      }
    }

    if (allIndexesPresent) {
      log('✓ All expected indexes are present', 'database');
    } else {
      log('⚠️  Some indexes are missing. Consider running migrations to create them.', 'database');
    }

    // Log total index count
    const totalIndexes = Object.values(indexesByTable).reduce((sum, idxs) => sum + idxs.length, 0);
    log(`Total indexes in database: ${totalIndexes}`, 'database');

  } catch (error) {
    log(`Error verifying indexes: ${error}`, 'database');
  }
};


// Redis Connection (for caching)
export const connectRedis = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 5000, // 5 second timeout
        reconnectStrategy: isProduction 
          ? (retries) => Math.min(retries * 50, 500) // Retry in production with exponential backoff
          : false // Don't retry in development
      }
    });

    redisClient.on('error', (err) => {
      if (isProduction) {
        log(`Redis error: ${err.message}`, 'database');
      }
      // Suppress error logging in development
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
    
    // Connect to MySQL for all data (required)
    try {
      mysqlConnection = await connectMySQL();
      db = drizzle(mysqlConnection);
      log('MySQL connection pool established successfully', 'database');
      
      // Verify database indexes
      await verifyIndexes();
      
      // Log pool stats periodically - less frequent in production
      const statsInterval = process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 5 * 60 * 1000;
      setInterval(() => {
        const stats = getPoolStats();
        if (stats) {
          log(`Connection Pool Stats - Total: ${stats.totalConnections}, Free: ${stats.freeConnections}, Queued: ${stats.queuedRequests}, Limit: ${stats.connectionLimit}`, 'database');
        }
      }, statsInterval); // 15 minutes in production, 5 minutes in development
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