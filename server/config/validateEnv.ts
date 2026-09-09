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

  // Check for DATABASE_URL or individual PostgreSQL credentials
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasMysqlCredentials = 
    !!process.env.POSTGRES_USER &&
    !!process.env.POSTGRES_PASSWORD &&
    !!process.env.POSTGRES_DB &&
    !!process.env.DB_HOST &&
    !!process.env.DB_PORT;

  if (!hasDatabaseUrl && !hasMysqlCredentials) {
    errors.push(
      'Database configuration is missing. Please provide either:\n' +
      '  - DATABASE_URL (connection string), OR\n' +
      '  - All PostgreSQL credentials (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DB_HOST, DB_PORT)'
    );
    
    if (!process.env.POSTGRES_USER) missingVars.push('POSTGRES_USER');
    if (!process.env.POSTGRES_PASSWORD) missingVars.push('POSTGRES_PASSWORD');
    if (!process.env.POSTGRES_DB) missingVars.push('POSTGRES_DB');
    if (!process.env.DB_HOST) missingVars.push('DB_HOST');
    if (!process.env.DB_PORT) missingVars.push('DB_PORT');
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
  const hasResend = !!process.env.RESEND_API_KEY;
  const emailVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
  const missingEmailVars = emailVars.filter(key => !process.env[key]);
  
  if (!hasResend && missingEmailVars.length > 0) {
    warnings.push(
      '⚠️  Email service not fully configured. Email features will be disabled.\n' +
      '  Missing: ' + missingEmailVars.join(', ') + ' (or set RESEND_API_KEY)\n' +
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

  const result = validateEnvironmentVariables();

  if (!result.isValid) {


    result.errors.forEach(error => {

    });


    process.exit(1);
  }

  // Display warnings if any
  if (result.warnings.length > 0) {

    result.warnings.forEach(warning => {

    });
  }

}

/**
 * Logs the current environment configuration (without sensitive values)
 */
export function logEnvironmentConfig(): void {




  // Database config
  if (process.env.DATABASE_URL) {

  } else {


  }
  
  // JWT config
  if (process.env.JWT_SECRET) {
    const secretLength = process.env.JWT_SECRET.length;



  }
  
  // Gemini config
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (apiKey) {
    const maskedKey = apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4);

  }
  
  // Email config
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {


  } else {

  }
  
  // Security config






}
