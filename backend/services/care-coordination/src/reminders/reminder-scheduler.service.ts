import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { JobsService } from '../jobs/jobs.service';

interface ReminderTask {
  id: string;
  tenantId: string;
  patientId: string;
  enrollmentId: string;
  dueDate: Date;
  reminderCount: number;
  nextReminderAt: Date | null;
}

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Runs every 15 minutes. Finds tasks whose nextReminderAt has arrived and
   * enqueues SEND_REMINDER jobs for them, then advances the next reminder time.
   */
  @Cron('0 */15 * * * *')
  async scanForPendingReminders(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('scanForPendingReminders skipped — previous run still active');
      return;
    }

    this.isRunning = true;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    try {
      const tasks = await this.prisma.careTask.findMany({
        where: {
          status: { in: ['pending', 'upcoming', 'active'] },
          nextReminderAt: { not: null, lte: now },
        },
        take: 100,
        orderBy: { nextReminderAt: 'asc' },
        select: {
          id: true,
          tenantId: true,
          patientId: true,
          enrollmentId: true,
          dueDate: true,
          reminderCount: true,
          nextReminderAt: true,
        },
      });

      if (tasks.length === 0) {
        return;
      }

      this.logger.log(`Processing ${tasks.length} pending reminder(s)`);

      await Promise.all(
        tasks.map((task) => this.processTask(task as ReminderTask, now, today)),
      );
    } catch (err: any) {
      this.logger.error(
        `scanForPendingReminders encountered an error: ${err?.message}`,
        err?.stack,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async processTask(
    task: ReminderTask,
    now: Date,
    today: Date,
  ): Promise<void> {
    const dueDay = new Date(task.dueDate);
    dueDay.setHours(0, 0, 0, 0);

    const isOverdue = dueDay < today;
    const reminderType: 'overdue' | 'upcoming' = isOverdue ? 'overdue' : 'upcoming';

    const todayStr = now.toISOString().slice(0, 10);
    const idempotencyKey = `${task.tenantId}:SEND_REMINDER:${task.id}:${todayStr}`;

    try {
      await this.jobsService.enqueue(
        task.tenantId,
        'SEND_REMINDER',
        {
          taskId: task.id,
          patientId: task.patientId,
          enrollmentId: task.enrollmentId,
          reminderType,
        },
        {
          taskId: task.id,
          patientId: task.patientId,
          enrollmentId: task.enrollmentId,
          idempotencyKey,
        },
      );

      const nextReminderAt = this.computeNextReminderAt(task, now, today, isOverdue);

      await this.prisma.careTask.update({
        where: { id: task.id },
        data: {
          lastReminderSentAt: now,
          reminderCount: { increment: 1 },
          nextReminderAt,
        },
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to process reminder for task ${task.id}: ${err?.message}`,
        err?.stack,
      );
    }
  }

  private computeNextReminderAt(
    task: ReminderTask,
    now: Date,
    today: Date,
    isOverdue: boolean,
  ): Date | null {
    if (isOverdue) {
      // Re-remind every 24 hours for overdue tasks
      const next = new Date(now);
      next.setHours(next.getHours() + 24);
      return next;
    }

    const dueDay = new Date(task.dueDate);
    dueDay.setHours(0, 0, 0, 0);

    const todayMs = today.getTime();
    const dueDayMs = dueDay.getTime();
    const msPerDay = 24 * 60 * 60 * 1000;

    const daysUntilDue = Math.round((dueDayMs - todayMs) / msPerDay);

    if (daysUntilDue > 3) {
      // Next reminder at dueDate minus 3 days
      const next = new Date(dueDay);
      next.setDate(next.getDate() - 3);
      // Set to a reasonable time (8 AM)
      next.setHours(8, 0, 0, 0);
      return next;
    }

    if (daysUntilDue >= 1 && daysUntilDue <= 3) {
      // Next reminder at dueDate minus 1 day
      const next = new Date(dueDay);
      next.setDate(next.getDate() - 1);
      next.setHours(8, 0, 0, 0);
      return next;
    }

    // Due today — no further upcoming reminder needed; will be handled by
    // overdue logic once the date passes
    return null;
  }
}
