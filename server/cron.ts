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

  // Run every hour to check for due study tasks
  cron.schedule('0 * * * *', async () => {
    Logger.info(LogCategory.SYSTEM, 'Running hourly study reminder check');
    try {
      await sendStudyReminders();
    } catch (error) {
      Logger.error(LogCategory.SYSTEM, 'Error in cron job', error as Error);
    }
  });

  // Run daily at midnight to clean up expired media
  cron.schedule('0 0 * * *', async () => {
    Logger.info(LogCategory.SYSTEM, 'Running daily media cleanup');
    try {
      await cleanupExpiredMedia();
    } catch (error) {
      Logger.error(LogCategory.SYSTEM, 'Error in media cleanup cron job', error as Error);
    }
  });
}

async function sendStudyReminders() {
  // Get all active study plans
  const activePlans = await db
    .select({
      plan: studyPlans,
      user: users,
    })
    .from(studyPlans)
    .innerJoin(users, eq(studyPlans.userId, users.id))
    .where(eq(studyPlans.status, 'active'));

  const today = new Date();
  
  for (const { plan, user } of activePlans) {
    if (!plan.scheduleData) continue;
    
    try {
      const scheduleItems = typeof plan.scheduleData === 'string' 
        ? JSON.parse(plan.scheduleData) 
        : plan.scheduleData;
        
      if (!Array.isArray(scheduleItems)) continue;

      // Check for incomplete tasks scheduled for today
      let todayTaskCount = 0;
      for (const item of scheduleItems) {
        if (!item.completed && item.scheduledDate) {
          const itemDate = new Date(item.scheduledDate);
          if (
            itemDate.getDate() === today.getDate() &&
            itemDate.getMonth() === today.getMonth() &&
            itemDate.getFullYear() === today.getFullYear()
          ) {
            todayTaskCount++;
          }
        }
      }

      if (todayTaskCount > 0) {
        // Send email
        await emailService.sendStudyReminderEmail(
          user.id,
          user.email,
          user.username,
          plan.title,
          todayTaskCount
        );
        Logger.info(LogCategory.SYSTEM, `Sent study reminder to ${user.email} for ${todayTaskCount} tasks`);
      }
    } catch (e) {
      Logger.error(LogCategory.SYSTEM, `Error processing study plan ${plan.id} for reminders`, e as Error);
    }
  }
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
