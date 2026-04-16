import { db } from '../db';
import { studyPlans, users } from '../../shared/schema';
import { eq, and, lte, gte, isNull, or } from 'drizzle-orm';
import { EmailService } from './email.service';
import { Logger, LogCategory } from '../utils/logger';

/**
 * StudyPlanReminderService
 * 
 * Handles automated reminders and notifications for study plans:
 * - Daily study reminders
 * - Upcoming task notifications (1 hour before)
 * - Overdue task alerts
 * - Weekly progress summaries
 * - Streak maintenance reminders
 */

export interface StudyPlanItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  completed: boolean;
  dayNumber?: number;
  difficulty?: string;
  type?: string;
  scheduledDate?: string | null;
  reminderSent?: boolean;
}

export interface StudyPlan {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  scheduleData: StudyPlanItem[] | string;
  startDate: string | null;
  endDate: string | null;
  reminderEnabled?: boolean;
  reminderTime?: string; // HH:MM format
}

export class StudyPlanReminderService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Send daily study reminders to users with active study plans
   * Should be run once per day via cron job
   */
  async sendDailyReminders(): Promise<void> {
    try {
      Logger.info(LogCategory.SYSTEM, 'Starting daily study plan reminders');

      // Get all active study plans with reminders enabled
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activePlans = await db
        .select()
        .from(studyPlans)
        .where(
          or(
            isNull(studyPlans.endDate),
            gte(studyPlans.endDate, today)
          )
        );

      Logger.info(LogCategory.SYSTEM, `Found ${activePlans.length} active study plans`);

      for (const plan of activePlans) {
        try {
          await this.sendDailyReminderForPlan(plan);
        } catch (error) {
          Logger.error(
            LogCategory.SYSTEM,
            `Failed to send reminder for plan ${plan.id}`,
            error as Error
          );
        }
      }

      Logger.info(LogCategory.SYSTEM, 'Completed daily study plan reminders');
    } catch (error) {
      Logger.error(LogCategory.SYSTEM, 'Error in sendDailyReminders', error as Error);
      throw error;
    }
  }

  /**
   * Send reminder for a specific study plan
   */
  private async sendDailyReminderForPlan(plan: any): Promise<void> {
    try {
      // Get user details
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, plan.userId))
        .limit(1);

      if (!user || user.length === 0) {
        Logger.warn(LogCategory.SYSTEM, `User not found for plan ${plan.id}`);
        return;
      }

      const userData = user[0];

      // Parse schedule data
      const scheduleData: StudyPlanItem[] =
        typeof plan.scheduleData === 'string'
          ? JSON.parse(plan.scheduleData || '[]')
          : plan.scheduleData || [];

      // Get today's tasks (incomplete tasks)
      const today = new Date();
      const todaysTasks = scheduleData.filter((item) => !item.completed);

      if (todaysTasks.length === 0) {
        Logger.info(LogCategory.SYSTEM, `No pending tasks for plan ${plan.id}`);
        return;
      }

      // Calculate progress
      const totalTasks = scheduleData.length;
      const completedTasks = scheduleData.filter((item) => item.completed).length;
      const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

      // Send email reminder
      const emailHtml = this.getDailyReminderTemplate(
        userData.username,
        plan.title,
        todaysTasks,
        progressPercentage,
        completedTasks,
        totalTasks
      );
      
      await this.emailService.sendStudyPlanEmail(
        userData.id,
        userData.email,
        `📚 Daily Study Reminder: ${plan.title}`,
        emailHtml,
        emailHtml // Use same content for text version
      );

      Logger.info(LogCategory.SYSTEM, `Sent daily reminder for plan ${plan.id} to user ${userData.email}`);
    } catch (error) {
      Logger.error(
        LogCategory.SYSTEM,
        `Error sending reminder for plan ${plan.id}`,
        error as Error
      );
      throw error;
    }
  }

  /**
   * Send upcoming task notifications (1 hour before scheduled time)
   * Should be run hourly via cron job
   */
  async sendUpcomingTaskNotifications(): Promise<void> {
    try {
      Logger.info(LogCategory.SYSTEM, 'Checking for upcoming tasks');

      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const activePlans = await db
        .select()
        .from(studyPlans)
        .where(
          or(
            isNull(studyPlans.endDate),
            gte(studyPlans.endDate, now)
          )
        );

      for (const plan of activePlans) {
        try {
          await this.checkUpcomingTasksForPlan(plan, now, oneHourFromNow);
        } catch (error) {
          Logger.error(
            LogCategory.SYSTEM,
            `Failed to check upcoming tasks for plan ${plan.id}`,
            error as Error
          );
        }
      }
    } catch (error) {
      Logger.error(LogCategory.SYSTEM, 'Error in sendUpcomingTaskNotifications', error as Error);
    }
  }

  /**
   * Check for upcoming tasks in a specific plan
   */
  private async checkUpcomingTasksForPlan(
    plan: any,
    now: Date,
    oneHourFromNow: Date
  ): Promise<void> {
    const scheduleData: StudyPlanItem[] =
      typeof plan.scheduleData === 'string'
        ? JSON.parse(plan.scheduleData || '[]')
        : plan.scheduleData || [];

    const upcomingTasks = scheduleData.filter((item) => {
      if (item.completed || item.reminderSent) return false;
      if (!item.scheduledDate) return false;

      const scheduledTime = new Date(item.scheduledDate);
      return scheduledTime >= now && scheduledTime <= oneHourFromNow;
    });

    if (upcomingTasks.length === 0) return;

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, plan.userId))
      .limit(1);

    if (!user || user.length === 0) return;

    const userData = user[0];

    // Send notification
    const emailHtml = this.getUpcomingTaskTemplate(userData.username, plan.title, upcomingTasks);
    
    await this.emailService.sendStudyPlanEmail(
      userData.id,
      userData.email,
      `⏰ Upcoming Study Session: ${plan.title}`,
      emailHtml,
      emailHtml
    );

    // Mark reminders as sent
    upcomingTasks.forEach((task) => {
      task.reminderSent = true;
    });

    // Update plan with reminder flags
    await db
      .update(studyPlans)
      .set({ scheduleData: JSON.stringify(scheduleData) })
      .where(eq(studyPlans.id, plan.id));

    Logger.info(
      LogCategory.SYSTEM,
      `Sent upcoming task notification for plan ${plan.id}`
    );
  }

  /**
   * Send overdue task alerts
   * Should be run daily via cron job
   */
  async sendOverdueTaskAlerts(): Promise<void> {
    try {
      Logger.info(LogCategory.SYSTEM, 'Checking for overdue tasks');

      const now = new Date();
      const activePlans = await db
        .select()
        .from(studyPlans)
        .where(
          or(
            isNull(studyPlans.endDate),
            gte(studyPlans.endDate, now)
          )
        );

      for (const plan of activePlans) {
        try {
          await this.checkOverdueTasksForPlan(plan, now);
        } catch (error) {
          Logger.error(
            LogCategory.SYSTEM,
            `Failed to check overdue tasks for plan ${plan.id}`,
            error as Error
          );
        }
      }
    } catch (error) {
      Logger.error(LogCategory.SYSTEM, 'Error in sendOverdueTaskAlerts', error as Error);
    }
  }

  /**
   * Check for overdue tasks in a specific plan
   */
  private async checkOverdueTasksForPlan(plan: any, now: Date): Promise<void> {
    const scheduleData: StudyPlanItem[] =
      typeof plan.scheduleData === 'string'
        ? JSON.parse(plan.scheduleData || '[]')
        : plan.scheduleData || [];

    const overdueTasks = scheduleData.filter((item) => {
      if (item.completed) return false;
      if (!item.scheduledDate) return false;

      const scheduledTime = new Date(item.scheduledDate);
      const daysSinceScheduled = Math.floor(
        (now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60 * 24)
      );

      return daysSinceScheduled > 0;
    });

    if (overdueTasks.length === 0) return;

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, plan.userId))
      .limit(1);

    if (!user || user.length === 0) return;

    const userData = user[0];

    // Send alert
    const emailHtml = this.getOverdueTaskTemplate(userData.username, plan.title, overdueTasks);
    
    await this.emailService.sendStudyPlanEmail(
      userData.id,
      userData.email,
      `⚠️ Overdue Study Tasks: ${plan.title}`,
      emailHtml,
      emailHtml
    );

    Logger.info(LogCategory.SYSTEM, `Sent overdue alert for plan ${plan.id}`);
  }

  /**
   * Send weekly progress summary
   * Should be run weekly via cron job
   */
  async sendWeeklyProgressSummaries(): Promise<void> {
    try {
      Logger.info(LogCategory.SYSTEM, 'Sending weekly progress summaries');

      const activePlans = await db.select().from(studyPlans);

      for (const plan of activePlans) {
        try {
          await this.sendWeeklySummaryForPlan(plan);
        } catch (error) {
          Logger.error(
            LogCategory.SYSTEM,
            `Failed to send weekly summary for plan ${plan.id}`,
            error as Error
          );
        }
      }
    } catch (error) {
      Logger.error(LogCategory.SYSTEM, 'Error in sendWeeklyProgressSummaries', error as Error);
    }
  }

  /**
   * Send weekly summary for a specific plan
   */
  private async sendWeeklySummaryForPlan(plan: any): Promise<void> {
    const scheduleData: StudyPlanItem[] =
      typeof plan.scheduleData === 'string'
        ? JSON.parse(plan.scheduleData || '[]')
        : plan.scheduleData || [];

    const totalTasks = scheduleData.length;
    const completedTasks = scheduleData.filter((item) => item.completed).length;
    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, plan.userId))
      .limit(1);

    if (!user || user.length === 0) return;

    const userData = user[0];

    // Send summary
    const emailHtml = this.getWeeklySummaryTemplate(
      userData.username,
      plan.title,
      completedTasks,
      totalTasks,
      progressPercentage
    );
    
    await this.emailService.sendStudyPlanEmail(
      userData.id,
      userData.email,
      `📊 Weekly Progress: ${plan.title}`,
      emailHtml,
      emailHtml
    );

    Logger.info(LogCategory.SYSTEM, `Sent weekly summary for plan ${plan.id}`);
  }

  // Email Templates

  private getDailyReminderTemplate(
    username: string,
    planTitle: string,
    tasks: StudyPlanItem[],
    progress: number,
    completed: number,
    total: number
  ): string {
    const taskList = tasks
      .slice(0, 3)
      .map((task) => `• ${task.title} (${task.duration} min)`)
      .join('\n');

    return `
Hi ${username},

Time to continue your learning journey! 📚

Study Plan: ${planTitle}
Progress: ${progress}% (${completed}/${total} tasks completed)

Today's Tasks:
${taskList}
${tasks.length > 3 ? `\n...and ${tasks.length - 3} more tasks` : ''}

Keep up the great work! Consistency is key to mastering new skills.

Best regards,
StudyForge Team
    `.trim();
  }

  private getUpcomingTaskTemplate(
    username: string,
    planTitle: string,
    tasks: StudyPlanItem[]
  ): string {
    const taskList = tasks
      .map((task) => `• ${task.title} (${task.duration} min)`)
      .join('\n');

    return `
Hi ${username},

Your study session is starting in 1 hour! ⏰

Study Plan: ${planTitle}

Upcoming Tasks:
${taskList}

Get ready to learn!

Best regards,
StudyForge Team
    `.trim();
  }

  private getOverdueTaskTemplate(
    username: string,
    planTitle: string,
    tasks: StudyPlanItem[]
  ): string {
    const taskList = tasks
      .slice(0, 5)
      .map((task) => `• ${task.title}`)
      .join('\n');

    return `
Hi ${username},

You have ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''} in your study plan. ⚠️

Study Plan: ${planTitle}

Overdue Tasks:
${taskList}
${tasks.length > 5 ? `\n...and ${tasks.length - 5} more` : ''}

Don't worry! It's never too late to get back on track. Even a small step forward is progress.

Best regards,
StudyForge Team
    `.trim();
  }

  private getWeeklySummaryTemplate(
    username: string,
    planTitle: string,
    completed: number,
    total: number,
    progress: number
  ): string {
    const motivationalMessage =
      progress >= 80
        ? "Outstanding progress! You're crushing it! 🎉"
        : progress >= 50
        ? "Great work! You're making solid progress! 💪"
        : progress >= 25
        ? "Keep going! Every step counts! 🌟"
        : "Let's get back on track! You've got this! 💪";

    return `
Hi ${username},

Here's your weekly progress summary for: ${planTitle}

📊 Progress: ${progress}%
✅ Completed: ${completed}/${total} tasks
⏳ Remaining: ${total - completed} tasks

${motivationalMessage}

Keep up the momentum and continue your learning journey!

Best regards,
StudyForge Team
    `.trim();
  }
}

export const studyPlanReminderService = new StudyPlanReminderService();
