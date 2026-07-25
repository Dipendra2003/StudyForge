/**
 * Security Headers Middleware
 * Implements security headers using Helmet.js
 * Requirements: 8.8
 */

import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { SECURITY_HEADERS } from '../config/security';

/**
 * Configure Helmet with security headers
 * Requirements: 8.8
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: process.env.NODE_ENV === 'production' 
    ? SECURITY_HEADERS.contentSecurityPolicy 
    : false, // Disable in development for Vite HMR
  
  // HTTP Strict Transport Security (HSTS)
  // Only enable in production with HTTPS
  hsts: process.env.NODE_ENV === 'production' 
    ? SECURITY_HEADERS.hsts 
    : false,
  
  // Prevent clickjacking but allow same-origin iframes for document preview modals
  frameguard: { action: 'sameorigin' },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // Enable XSS filter
  xssFilter: true,
  
  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // DNS prefetch control
  dnsPrefetchControl: { allow: false },
  
  // Download options for IE8+
  ieNoOpen: true,
});

/**
 * Custom security headers middleware
 * Adds additional security headers not covered by Helmet
 * Requirements: 8.8
 */
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  
  // X-Content-Type-Options (redundant with Helmet but explicit)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options (redundant with Helmet but explicit)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // X-XSS-Protection (redundant with Helmet but explicit)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
}

/**
 * Security logging middleware
 * Logs suspicious requests for security monitoring
 * Requirements: 8.7
 */
export function securityLogging(req: Request, res: Response, next: NextFunction): void {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i, // Event handlers like onclick=
    /\.\.\//,  // Directory traversal
    /union.*select/i, // SQL injection
    /exec\(/i, // Code execution
  ];
  
  const url = req.url;
  const body = JSON.stringify(req.body);
  const query = JSON.stringify(req.query);
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(body) || pattern.test(query)) {
      console.warn('[SECURITY] Suspicious request detected:', {
        ip: req.ip || req.socket.remoteAddress,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        pattern: pattern.toString(),
      });
      break;
    }
  }
  
  next();
}
