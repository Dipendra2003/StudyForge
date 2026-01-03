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
  warnings: string[];
}

/**
 * Validates that all required environment variables are set
 * @returns Validation result with missing variables, errors, and warnings
 */
export function validateEnvironmentVariables(): EnvValidationResult {
  const missingVars: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

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

  // Check for JWT_SECRET (Required for authentication)
  if (!process.env.JWT_SECRET) {
    missingVars.push('JWT_SECRET');
    errors.push(
      'JWT_SECRET is required for authentication.\n' +
      '  Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push(
      'JWT_SECRET must be at least 32 characters long for security.\n' +
      '  Current length: ' + process.env.JWT_SECRET.length + ' characters\n' +
      '  Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Check for Gemini API key
  if (!process.env.GEMINI_API_KEY) {
    missingVars.push('GEMINI_API_KEY');
    errors.push(
      'GEMINI_API_KEY is required for AI-powered features (chat, code generation, flashcard generation).\n' +
      '  Get your API key from: https://aistudio.google.com/app/apikey'
    );
  }

  // Check for email configuration (Optional but recommended)
  const emailVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
  const missingEmailVars = emailVars.filter(key => !process.env[key]);
  
  if (missingEmailVars.length > 0) {
    warnings.push(
      '⚠️  Email service not fully configured. Email features will be disabled.\n' +
      '  Missing: ' + missingEmailVars.join(', ') + '\n' +
      '  Email is required for:\n' +
      '    - Email verification during registration\n' +
      '    - Password reset functionality\n' +
      '    - Account security notifications'
    );
  }

  return {
    isValid: missingVars.length === 0 && errors.length === 0,
    missingVars,
    errors,
    warnings
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

  // Display warnings if any
  if (result.warnings.length > 0) {
    console.log('⚠️  Configuration Warnings:\n');
    result.warnings.forEach(warning => {
      console.log(`  ${warning}\n`);
    });
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
  
  // JWT config
  if (process.env.JWT_SECRET) {
    const secretLength = process.env.JWT_SECRET.length;
    console.log(`  - JWT Secret: Configured (${secretLength} characters)`);
    console.log(`  - JWT Access Token Expiry: ${process.env.JWT_ACCESS_EXPIRY || '15m'}`);
    console.log(`  - JWT Refresh Token Expiry: ${process.env.JWT_REFRESH_EXPIRY || '7d'}`);
  }
  
  // Gemini config
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (apiKey) {
    const maskedKey = apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4);
    console.log(`  - Gemini API Key: ${maskedKey}`);
  }
  
  // Email config
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    console.log(`  - Email Service: Configured (${process.env.SMTP_HOST})`);
    console.log(`  - Email From: ${process.env.SMTP_FROM_NAME || 'StudyForge'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`);
  } else {
    console.log('  - Email Service: Not configured (email features disabled)');
  }
  
  // Security config
  console.log(`  - BCrypt Rounds: ${process.env.BCRYPT_ROUNDS || '12'}`);
  console.log(`  - Verification Token Expiry: ${process.env.TOKEN_EXPIRY_HOURS_VERIFICATION || '24'} hours`);
  console.log(`  - Reset Token Expiry: ${process.env.TOKEN_EXPIRY_HOURS_RESET || '1'} hour`);
  console.log(`  - Rate Limit Window: ${process.env.RATE_LIMIT_WINDOW_MS || '900000'}ms`);
  console.log(`  - Rate Limit Max Requests: ${process.env.RATE_LIMIT_MAX_REQUESTS || '5'}`);
  
  console.log('');
}
