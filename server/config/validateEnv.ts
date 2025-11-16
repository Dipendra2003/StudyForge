/**
 * Environment Variable Validation Module
 * 
 * This module validates that all required environment variables are present
 * before the application starts. It exits gracefully with descriptive error
 * messages if any required variables are missing.
 */

interface EnvValidationResult {
  isValid: boolean;
  missingVars: string[];
  errors: string[];
}

/**
 * Validates that all required environment variables are set
 * @returns Validation result with missing variables and errors
 */
export function validateEnvironmentVariables(): EnvValidationResult {
  const missingVars: string[] = [];
  const errors: string[] = [];

  // Check for DATABASE_URL or individual MySQL credentials
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasMysqlCredentials = 
    !!process.env.MYSQL_HOST &&
    !!process.env.MYSQL_PORT &&
    !!process.env.MYSQL_USERNAME &&
    !!process.env.MYSQL_PASSWORD &&
    !!process.env.MYSQL_DATABASE;

  if (!hasDatabaseUrl && !hasMysqlCredentials) {
    errors.push(
      'Database configuration is missing. Please provide either:\n' +
      '  - DATABASE_URL (connection string), OR\n' +
      '  - All MySQL credentials (MYSQL_HOST, MYSQL_PORT, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE)'
    );
    
    if (!process.env.MYSQL_HOST) missingVars.push('MYSQL_HOST');
    if (!process.env.MYSQL_PORT) missingVars.push('MYSQL_PORT');
    if (!process.env.MYSQL_USERNAME) missingVars.push('MYSQL_USERNAME');
    if (!process.env.MYSQL_PASSWORD) missingVars.push('MYSQL_PASSWORD');
    if (!process.env.MYSQL_DATABASE) missingVars.push('MYSQL_DATABASE');
  }

  // Check for Gemini API key
  if (!process.env.GEMINI_API_KEY) {
    missingVars.push('GEMINI_API_KEY');
    errors.push(
      'GEMINI_API_KEY is required for AI-powered features (chat, code generation, flashcard generation).\n' +
      '  Get your API key from: https://aistudio.google.com/app/apikey'
    );
  }

  // Session secret is no longer required (using JWT authentication)

  // Check for JWT secrets (required in production)
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_ACCESS_SECRET) {
      missingVars.push('JWT_ACCESS_SECRET');
      errors.push(
        'JWT_ACCESS_SECRET is required for JWT token authentication in production.\n' +
        '  Generate a secure secret: openssl rand -base64 32\n' +
        '  or: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    } else if (process.env.JWT_ACCESS_SECRET.length < 32) {
      errors.push(
        'JWT_ACCESS_SECRET must be at least 32 characters long for security.\n' +
        '  Generate a secure secret: openssl rand -base64 32'
      );
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      missingVars.push('JWT_REFRESH_SECRET');
      errors.push(
        'JWT_REFRESH_SECRET is required for JWT token refresh in production.\n' +
        '  Generate a secure secret: openssl rand -base64 32\n' +
        '  or: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    } else if (process.env.JWT_REFRESH_SECRET.length < 32) {
      errors.push(
        'JWT_REFRESH_SECRET must be at least 32 characters long for security.\n' +
        '  Generate a secure secret: openssl rand -base64 32'
      );
    }

    // Ensure JWT secrets are different
    if (process.env.JWT_ACCESS_SECRET && 
        process.env.JWT_REFRESH_SECRET && 
        process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
      errors.push(
        'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different for security.\n' +
        '  Generate two different secrets using: openssl rand -base64 32'
      );
    }
  }

  // Check for email service configuration (Gmail SMTP)
  const hasGmailConfig = !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;

  if (process.env.NODE_ENV === 'production' && !hasGmailConfig) {
    errors.push(
      'Email service configuration is required for production. Please provide:\n' +
      '  - GMAIL_USER (your Gmail address)\n' +
      '  - GMAIL_APP_PASSWORD (16-character app password from Google)\n' +
      '  Get Gmail App Password from: https://myaccount.google.com/apppasswords'
    );
    
    if (!process.env.GMAIL_USER) missingVars.push('GMAIL_USER');
    if (!process.env.GMAIL_APP_PASSWORD) missingVars.push('GMAIL_APP_PASSWORD');
  }

  // Check for APP_URL (required for email links)
  if (!process.env.APP_URL) {
    missingVars.push('APP_URL');
    errors.push(
      'APP_URL is required for generating email verification and password reset links.\n' +
      '  Development: http://localhost:5000\n' +
      '  Production: https://your-domain.com'
    );
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
    errors
  };
}

/**
 * Validates environment variables and exits the process if validation fails
 * This should be called at application startup before any other initialization
 */
export function validateEnvOrExit(): void {
  console.log('🔍 Validating environment variables...\n');

  const result = validateEnvironmentVariables();

  if (!result.isValid) {
    console.error('❌ Environment validation failed!\n');
    console.error('Missing required environment variables:\n');
    
    result.errors.forEach(error => {
      console.error(`  ${error}\n`);
    });

    console.error('Please check your .env file and ensure all required variables are set.');
    console.error('See .env.example for reference.\n');
    
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully\n');
}

/**
 * Logs the current environment configuration (without sensitive values)
 */
export function logEnvironmentConfig(): void {
  console.log('📋 Environment Configuration:');
  console.log(`  - Node Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  - API Port: ${process.env.API_PORT || '5000'}`);
  console.log(`  - App URL: ${process.env.APP_URL || 'http://localhost:5000'}`);
  
  // Database config
  if (process.env.DATABASE_URL) {
    console.log('  - Database: Connected via DATABASE_URL');
  } else {
    console.log(`  - Database: MySQL at ${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}`);
    console.log(`  - Database Name: ${process.env.MYSQL_DATABASE}`);
  }
  
  // Gemini config
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (apiKey) {
    const maskedKey = apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4);
    console.log(`  - Gemini API Key: ${maskedKey}`);
  }
  
  // JWT config
  console.log(`  - JWT Access Secret: ${process.env.JWT_ACCESS_SECRET ? '✓ Set' : '✗ Not set'}`);
  console.log(`  - JWT Refresh Secret: ${process.env.JWT_REFRESH_SECRET ? '✓ Set' : '✗ Not set'}`);
  
  // Email service config
  const hasGmailConfig = !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
  
  if (hasGmailConfig) {
    console.log(`  - Email Service: Gmail SMTP (${process.env.GMAIL_USER})`);
  } else {
    console.log('  - Email Service: Development mode (console logging)');
  }
  
  console.log(`  - From Email: ${process.env.FROM_EMAIL || 'Not set (will use default)'}`);
  console.log('');
}
