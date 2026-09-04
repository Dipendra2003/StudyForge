import cron from 'node-cron';
import { db } from './db';
import { studyPlans, users, attachments } from '@shared/schema';
import { eq, and, lt, gt } from 'drizzle-orm';
import { cloudinaryService } from './services/cloudinary';
import { EmailService } from './services/email.service';
import { Logger, LogCategory } from './utils/logger';

const emailService = new EmailService();

export function setupCronJobs() {
  Logger.info(LogCategory.SYSTEM, 'Setting up cron jobs');

  // Run daily at midnight to clean up expired media based on user retention settings
  cron.schedule('0 0 * * *', async () => {
    Logger.info(LogCategory.SYSTEM, 'Running daily media cleanup');
    try {
      await cleanupExpiredMedia();
    } catch (error) {
      Logger.error(LogCategory.SYSTEM, 'Error in media cleanup cron job', error as Error);
    }
  });
}

async function cleanupExpiredMedia() {
  if (!cloudinaryService.isAvailable()) {
    Logger.warn(LogCategory.SYSTEM, 'Cloudinary not available, skipping media cleanup');
    return;
  }

  try {
    // Find all users who have enabled auto-delete (mediaRetentionDays > 0)
    const usersWithAutoDelete = await db
      .select({ id: users.id, mediaRetentionDays: users.mediaRetentionDays })
      .from(users)
      .where(gt(users.mediaRetentionDays, 0));

    let totalDeleted = 0;

    for (const user of usersWithAutoDelete) {
      const retentionDays = user.mediaRetentionDays || 0;
      if (retentionDays <= 0) continue;

      // Calculate cutoff date for this user
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Find attachments older than the cutoff date
      const expiredAttachments = await db
        .select()
        .from(attachments)
        .where(
          and(
            eq(attachments.userId, user.id),
            lt(attachments.createdAt, cutoffDate)
          )
        );

      if (expiredAttachments.length === 0) continue;

      Logger.info(LogCategory.SYSTEM, `Found ${expiredAttachments.length} expired attachments for user ${user.id}`);

      // Delete each attachment
      for (const attachment of expiredAttachments) {
        if (!attachment.fileUrl) continue;

        try {
          const publicId = cloudinaryService.extractPublicId(attachment.fileUrl);
          if (publicId) {
            await cloudinaryService.deleteImage(publicId);
          }
          
          // Delete from database
          await db.delete(attachments).where(eq(attachments.id, attachment.id));
          totalDeleted++;
        } catch (err) {
          Logger.error(LogCategory.SYSTEM, `Failed to delete attachment ${attachment.id}`, err as Error);
        }
      }
    }

    if (totalDeleted > 0) {
      Logger.info(LogCategory.SYSTEM, `Media cleanup complete. Deleted ${totalDeleted} attachments.`);
    }
  } catch (error) {
    Logger.error(LogCategory.SYSTEM, 'Failed to perform media cleanup', error as Error);
  }
}
