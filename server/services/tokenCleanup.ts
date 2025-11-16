/**
 * Token Cleanup Service
 * 
 * This service handles periodic cleanup of expired refresh tokens
 * from the database to prevent table bloat and maintain performance.
 */

import { jwtService } from './jwtService';
import { Logger, LogCategory } from '../utils/logger';

export class TokenCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  /**
   * Start the token cleanup service
   * Runs cleanup immediately and then every 24 hours
   */
  start(): void {
    if (this.cleanupInterval) {
      Logger.security('Token cleanup service already running', {
        action: 'cleanup_start',
      });
      return;
    }
    
    Logger.security('Starting token cleanup service', {
      action: 'cleanup_start',
      intervalHours: 24,
    });
    
    // Run cleanup immediately on start
    this.runCleanup();
    
    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }
  
  /**
   * Stop the token cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      
      Logger.security('Token cleanup service stopped', {
        action: 'cleanup_stop',
      });
    }
  }
  
  /**
   * Run the cleanup process
   */
  private async runCleanup(): Promise<void> {
    try {
      Logger.security('Running token cleanup', {
        action: 'cleanup_run',
        timestamp: new Date().toISOString(),
      });
      
      const deletedCount = await jwtService.cleanupExpiredTokens();
      
      Logger.security('Token cleanup completed', {
        action: 'cleanup_complete',
        deletedTokens: deletedCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      Logger.error(LogCategory.SECURITY, 'Token cleanup failed', error as Error, {
        action: 'cleanup_error',
      });
    }
  }
  
  /**
   * Manually trigger cleanup (useful for testing or admin operations)
   */
  async manualCleanup(): Promise<number> {
    Logger.security('Manual token cleanup triggered', {
      action: 'cleanup_manual',
    });
    
    const deletedCount = await jwtService.cleanupExpiredTokens();
    
    Logger.security('Manual token cleanup completed', {
      action: 'cleanup_manual_complete',
      deletedTokens: deletedCount,
    });
    
    return deletedCount;
  }
}

// Export singleton instance
export const tokenCleanupService = new TokenCleanupService();
