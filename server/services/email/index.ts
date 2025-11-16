import { GmailEmailService } from './gmailService';
import { DevEmailService } from './devEmailService';
import type { IEmailService } from './emailService';

/**
 * Factory function to create the appropriate email service based on environment
 * - Gmail credentials available: Uses GmailEmailService
 * - Missing credentials: Uses DevEmailService (console logging)
 */
export function createEmailService(): IEmailService {
  // Use Gmail SMTP if credentials are available (works in both dev and production)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('[Email Service] Using Gmail SMTP for email delivery');
    return new GmailEmailService();
  }
  
  // Use console logging when credentials are missing
  console.log('[Email Service] Using development email service (console logging)');
  return new DevEmailService();
}

// Lazy-loaded singleton instance - created on first access
let _emailService: IEmailService | null = null;

export const emailService = new Proxy({} as IEmailService, {
  get(target, prop) {
    if (!_emailService) {
      _emailService = createEmailService();
    }
    return (_emailService as any)[prop];
  }
});

// Export types and classes for testing
export type { IEmailService } from './emailService';
export { GmailEmailService } from './gmailService';
export { DevEmailService } from './devEmailService';
