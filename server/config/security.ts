/**
 * Security Configuration
 * Centralized security settings for the application
 * Requirements: 8.3, 8.4, 8.6, 8.8
 */

import type { CookieOptions } from 'express';

/**
 * Cookie security settings for refresh tokens
 * Requirements: 8.3, 8.4
 */
export const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true, // Prevents JavaScript access (XSS protection)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict', // CSRF protection - strict mode
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/', // Available across entire application
};

/**
 * CORS configuration
 * Requirements: 8.8
 */
export const CORS_CONFIG = {
  // Allowed origins - restrict to production domains in production
  origins: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || [])
    : ['http://localhost:5000', 'http://127.0.0.1:5000'],
  
  // Allow credentials for cookie-based authentication
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  
  // Exposed headers (headers that client can access)
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  
  // Preflight cache duration (in seconds)
  maxAge: 86400, // 24 hours
};

/**
 * Input sanitization configuration
 * Requirements: 8.6
 */
export const SANITIZATION_CONFIG = {
  // Maximum lengths for various inputs
  maxLengths: {
    username: 30,
    email: 100,
    password: 128,
    fullName: 100,
    generalText: 1000,
  },
  
  // Patterns for validation
  patterns: {
    // Username: 3-30 alphanumeric characters, underscores, hyphens, not starting with number
    username: /^[a-zA-Z_][a-zA-Z0-9_-]{2,29}$/,
    
    // Email: standard email format
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

/**
 * Security headers configuration
 * Requirements: 8.8
 */
export const SECURITY_HEADERS = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Note: unsafe-eval needed for Vite in dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'self'"], // Required for browser native PDF viewer plugins
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  
  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  
  // Other security headers
  frameguard: { action: 'sameorigin' }, // Prevent clickjacking but allow same-origin
  noSniff: true, // Prevent MIME type sniffing
  xssFilter: true, // Enable XSS filter
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
};

/**
 * Rate limiting configuration
 * Requirements: 8.5
 */
export const RATE_LIMIT_CONFIG = {
  // General authentication endpoints
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10), // 5 requests
    message: 'Too many attempts, please try again later',
  },
  
  // Registration endpoint (more restrictive)
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    message: 'Too many registration attempts, please try again later',
  },
  
  // Email verification and password reset (moderate)
  verification: {
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 requests per minute
    message: 'Too many requests, please wait before trying again',
  },
};

/**
 * Sanitize string input to prevent XSS
 * Requirements: 8.6
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Basic HTML entity encoding for special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
}

/**
 * Normalize and sanitize email address
 * Requirements: 8.6
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  
  // Trim and convert to lowercase
  let sanitized = email.trim().toLowerCase();
  
  // Remove any whitespace
  sanitized = sanitized.replace(/\s/g, '');
  
  // Basic validation - should match email pattern
  if (!SANITIZATION_CONFIG.patterns.email.test(sanitized)) {
    return '';
  }
  
  return sanitized;
}

/**
 * Validate and sanitize username
 * Requirements: 8.6
 */
export function sanitizeUsername(username: string): string {
  if (typeof username !== 'string') {
    return '';
  }
  
  // Trim whitespace
  let sanitized = username.trim();
  
  // Remove any characters that aren't alphanumeric, underscore, or hyphen
  sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
  
  // Ensure it matches the username pattern
  if (!SANITIZATION_CONFIG.patterns.username.test(sanitized)) {
    return '';
  }
  
  return sanitized;
}

/**
 * Check if origin is allowed based on CORS configuration
 * Requirements: 8.8
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }
  
  // In development, allow localhost
  if (process.env.NODE_ENV !== 'production') {
    return origin.includes('localhost') || origin.includes('127.0.0.1');
  }
  
  // In production, check against allowed origins
  return CORS_CONFIG.origins.includes(origin);
}
