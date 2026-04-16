import * as cron from 'node-cron';
import { studyPlanReminderService } from '../services/study-plan-reminder.service';
import { Logger, LogCategory } from '../utils/logger';

/**
 * Study Plan Scheduler
 * 
 * Manages cron jobs for study plan reminders and notifications:
 * - Daily reminders at 8:00 AM
 * - Hourly checks for upcoming tasks
 * - Daily overdue task alerts at 6:00 PM
 * - Weekly progress summaries on Sundays at 9:00 AM
 */

export class StudyPlanScheduler {
  private dailyReminderJob: ReturnType<typeof cron.schedule> | null = null;
  private upcomingTaskJob: ReturnType<typeof cron.schedule> | null = null;
  private overdueAlertJob: ReturnType<typeof cron.schedule> | null = null;
  private weeklySummaryJob: ReturnType<typeof cron.schedule> | null = null;

  /**
   * Start all scheduled jobs
   */
  start(): void {
    Logger.info(LogCategory.SYSTEM, 'Starting study plan scheduler');

    // Daily reminders at 8:00 AM every day
    this.dailyReminderJob = cron.schedule('0 8 * * *', async () => {
      Logger.info(LogCategory.SYSTEM, 'Running daily reminder job');
      try {
        await studyPlanReminderService.sendDailyReminders();
      } catch (error) {
        Logger.error(LogCategory.SYSTEM, 'Daily reminder job failed', error as Error);
      }
    });

    // Check for upcoming tasks every hour
    this.upcomingTaskJob = cron.schedule('0 * * * *', async () => {
      Logger.info(LogCategory.SYSTEM, 'Running upcoming task check');
      try {
        await studyPlanReminderService.sendUpcomingTaskNotifications();
      } catch (error) {
        Logger.error(LogCategory.SYSTEM, 'Upcoming task check failed', error as Error);
      }
    });

    // Overdue task alerts at 6:00 PM every day
    this.overdueAlertJob = cron.schedule('0 18 * * *', async () => {
      Logger.info(LogCategory.SYSTEM, 'Running overdue task alert job');
      try {
        await studyPlanReminderService.sendOverdueTaskAlerts();
      } catch (error) {
        Logger.error(LogCategory.SYSTEM, 'Overdue alert job failed', error as Error);
      }
    });

    // Weekly progress summaries on Sundays at 9:00 AM
    this.weeklySummaryJob = cron.schedule('0 9 * * 0', async () => {
      Logger.info(LogCategory.SYSTEM, 'Running weekly summary job');
      try {
        await studyPlanReminderService.sendWeeklyProgressSummaries();
      } catch (error) {
        Logger.error(LogCategory.SYSTEM, 'Weekly summary job failed', error as Error);
      }
    });

    Logger.info(LogCategory.SYSTEM, 'Study plan scheduler started successfully');
    Logger.info(LogCategory.SYSTEM, 'Scheduled jobs:');
    Logger.info(LogCategory.SYSTEM, '  - Daily reminders: 8:00 AM');
    Logger.info(LogCategory.SYSTEM, '  - Upcoming tasks: Every hour');
    Logger.info(LogCategory.SYSTEM, '  - Overdue alerts: 6:00 PM');
    Logger.info(LogCategory.SYSTEM, '  - Weekly summaries: Sundays 9:00 AM');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    Logger.info(LogCategory.SYSTEM, 'Stopping study plan scheduler');

    if (this.dailyReminderJob) {
      this.dailyReminderJob.stop();
      this.dailyReminderJob = null;
    }

    if (this.upcomingTaskJob) {
      this.upcomingTaskJob.stop();
      this.upcomingTaskJob = null;
    }

    if (this.overdueAlertJob) {
      this.overdueAlertJob.stop();
      this.overdueAlertJob = null;
    }

    if (this.weeklySummaryJob) {
      this.weeklySummaryJob.stop();
      this.weeklySummaryJob = null;
    }

    Logger.info(LogCategory.SYSTEM, 'Study plan scheduler stopped');
  }

  /**
   * Manually trigger daily reminders (for testing)
   */
  async triggerDailyReminders(): Promise<void> {
    Logger.info(LogCategory.SYSTEM, 'Manually triggering daily reminders');
    await studyPlanReminderService.sendDailyReminders();
  }

  /**
   * Manually trigger upcoming task check (for testing)
   */
  async triggerUpcomingTaskCheck(): Promise<void> {
    Logger.info(LogCategory.SYSTEM, 'Manually triggering upcoming task check');
    await studyPlanReminderService.sendUpcomingTaskNotifications();
  }

  /**
   * Manually trigger overdue alerts (for testing)
   */
  async triggerOverdueAlerts(): Promise<void> {
    Logger.info(LogCategory.SYSTEM, 'Manually triggering overdue alerts');
    await studyPlanReminderService.sendOverdueTaskAlerts();
  }

  /**
   * Manually trigger weekly summaries (for testing)
   */
  async triggerWeeklySummaries(): Promise<void> {
    Logger.info(LogCategory.SYSTEM, 'Manually triggering weekly summaries');
    await studyPlanReminderService.sendWeeklyProgressSummaries();
  }
}

export const studyPlanScheduler = new StudyPlanScheduler();
