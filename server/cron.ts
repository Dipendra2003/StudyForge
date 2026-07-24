import cron from 'node-cron';
import { db } from './db';
import { studyPlans, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
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
