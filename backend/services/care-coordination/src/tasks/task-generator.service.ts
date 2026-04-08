import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface RecurrenceParams {
  frequencyType: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom_days';
  frequencyValue?: number;
  startDate: Date;
  endDate: Date;
  windowEnd: Date;
}

@Injectable()
export class TaskGeneratorService {
  private readonly logger = new Logger(TaskGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates CareTask records for all matching interventions in a stage
   * within a rolling window of `windowDays` from today.
   */
  async generateTasksForStage(
    tenantId: string,
    enrollmentId: string,
    stageId: string,
    windowDays = 30,
  ): Promise<void> {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id: enrollmentId, tenantId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }

    const templates = await this.prisma.stageInterventionTemplate.findMany({
      where: { tenantId, stageId },
      orderBy: { sortOrder: 'asc' },
    });

    const stageEnteredAt = enrollment.currentStageEnteredAt;
    const today = new Date();
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + windowDays);

    // Fetch existing tasks for this stage to avoid duplicates
    const existingTasks = await this.prisma.careTask.findMany({
      where: {
        tenantId,
        enrollmentId,
        stageId,
        status: { notIn: ['cancelled'] },
      },
      select: { interventionTemplateId: true, dueDate: true },
    });

    const existingSet = new Set(
      existingTasks.map(
        (t) =>
          `${t.interventionTemplateId}:${t.dueDate.toISOString().slice(0, 10)}`,
      ),
    );

    const matchingTemplates = templates.filter(
      (t) =>
        t.careSetting === 'any' ||
        t.careSetting === enrollment.currentCareSetting,
    );

    const tasksToCreate: Record<string, unknown>[] = [];

    for (const template of matchingTemplates) {
      const templateStartDate = new Date(stageEnteredAt);
      templateStartDate.setDate(
        templateStartDate.getDate() + template.startDayOffset,
      );

      let stageEndDate: Date;
      if (template.endDayOffset != null) {
        stageEndDate = new Date(stageEnteredAt);
        stageEndDate.setDate(
          stageEndDate.getDate() + template.endDayOffset,
        );
      } else if (enrollment.expectedEndDate) {
        stageEndDate = new Date(enrollment.expectedEndDate);
      } else {
        stageEndDate = new Date(windowEnd);
      }

      const occurrences = this.calculateOccurrenceDates({
        frequencyType: template.frequencyType as RecurrenceParams['frequencyType'],
        frequencyValue: template.frequencyValue ?? undefined,
        startDate: templateStartDate,
        endDate: stageEndDate,
        windowEnd,
      });

      for (let i = 0; i < occurrences.length; i++) {
        const dueDate = occurrences[i];
        const dueDateKey = `${template.id}:${dueDate.toISOString().slice(0, 10)}`;

        if (existingSet.has(dueDateKey)) {
          continue;
        }

        existingSet.add(dueDateKey);

        // Compute nextReminderAt from reminderConfig
        let nextReminderAt: Date | undefined;
        const reminderConfig = template.reminderConfig as {
          beforeDueDays?: number[];
        } | null;
        if (reminderConfig?.beforeDueDays?.length) {
          const earliestBeforeDays = Math.max(...reminderConfig.beforeDueDays);
          nextReminderAt = new Date(dueDate);
          nextReminderAt.setDate(nextReminderAt.getDate() - earliestBeforeDays);
        }

        tasksToCreate.push({
          tenantId,
          patientId: enrollment.patientId,
          enrollmentId,
          stageId,
          patientDisplayName: enrollment.patientDisplayName ?? undefined,
          patientMrn: enrollment.patientMrn ?? undefined,
          interventionTemplateId: template.id,
          interventionType: template.interventionType,
          title: template.name,
          description: template.description ?? undefined,
          careSetting: enrollment.currentCareSetting,
          deliveryMode: template.deliveryMode,
          dueDate,
          assignedToRole: template.defaultOwnerRole ?? undefined,
          priority: template.priority,
          isCritical: template.isCritical,
          status: 'pending',
          autoCompleteSource: template.autoCompleteSource ?? undefined,
          autoCompleteEventType: template.autoCompleteEventType ?? undefined,
          occurrenceNumber: i + 1,
          totalOccurrences: occurrences.length,
          nextReminderAt: nextReminderAt ?? undefined,
          metadata: (template.metadata as any) ?? undefined,
        });
      }
    }

    if (tasksToCreate.length > 0) {
      await this.prisma.careTask.createMany({ data: tasksToCreate as any });
      this.logger.log(
        `Generated ${tasksToCreate.length} tasks for enrollment ${enrollmentId}, stage ${stageId}`,
      );
    } else {
      this.logger.debug(
        `No new tasks to generate for enrollment ${enrollmentId}, stage ${stageId}`,
      );
    }
  }

  /**
   * Cancels all pending/upcoming tasks for a given stage and records events.
   */
  async cancelStageTasksPending(
    tenantId: string,
    enrollmentId: string,
    stageId: string,
  ): Promise<void> {
    const tasksToCancel = await this.prisma.careTask.findMany({
      where: {
        tenantId,
        enrollmentId,
        stageId,
        status: { in: ['pending', 'upcoming'] },
      },
      select: { id: true, status: true },
    });

    if (tasksToCancel.length === 0) return;

    const taskIds = tasksToCancel.map((t) => t.id);

    await this.prisma.$transaction([
      this.prisma.careTask.updateMany({
        where: { id: { in: taskIds } },
        data: { status: 'cancelled' },
      }),
      this.prisma.careTaskEvent.createMany({
        data: tasksToCancel.map((task) => ({
          tenantId,
          taskId: task.id,
          eventType: 'status_changed',
          fromStatus: task.status,
          toStatus: 'cancelled',
          payload: { reason: 'Stage transition — pending tasks cancelled' },
        })),
      }),
    ]);

    this.logger.log(
      `Cancelled ${tasksToCancel.length} pending/upcoming tasks for enrollment ${enrollmentId}, stage ${stageId}`,
    );
  }

  /**
   * Called by daily cron: extends the task window for active enrollments
   * whose latest task dueDate is within 30 days of today.
   */
  async extendWindowForActiveEnrollments(tenantId: string): Promise<void> {
    const today = new Date();
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 30);

    // Find enrollments where the latest task dueDate < horizon
    const enrollments = await this.prisma.patientPathwayEnrollment.findMany({
      where: { tenantId, status: 'active' },
      select: {
        id: true,
        currentStageId: true,
        tasks: {
          where: { status: { notIn: ['cancelled'] } },
          orderBy: { dueDate: 'desc' },
          take: 1,
          select: { dueDate: true },
        },
      },
    });

    for (const enrollment of enrollments) {
      const latestTask = enrollment.tasks[0];

      // If no tasks yet OR the latest task is within 30 days, generate more
      if (!latestTask || latestTask.dueDate < horizon) {
        try {
          await this.generateTasksForStage(
            tenantId,
            enrollment.id,
            enrollment.currentStageId,
          );
        } catch (err) {
          this.logger.error(
            `Failed to extend window for enrollment ${enrollment.id}: ${(err as Error).message}`,
            (err as Error).stack,
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private calculateOccurrenceDates(params: RecurrenceParams): Date[] {
    const { frequencyType, frequencyValue, startDate, endDate, windowEnd } = params;
    const effectiveEnd = endDate < windowEnd ? endDate : windowEnd;

    if (startDate > effectiveEnd) return [];

    const dates: Date[] = [];

    switch (frequencyType) {
      case 'once': {
        if (startDate <= effectiveEnd) {
          dates.push(this.stripTime(startDate));
        }
        break;
      }

      case 'daily': {
        const cursor = this.stripTime(startDate);
        while (cursor <= effectiveEnd) {
          dates.push(new Date(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
        break;
      }

      case 'weekly': {
        dates.push(...this.everyNDays(startDate, effectiveEnd, 7));
        break;
      }

      case 'biweekly': {
        dates.push(...this.everyNDays(startDate, effectiveEnd, 14));
        break;
      }

      case 'monthly': {
        const cursor = this.stripTime(startDate);
        const dayOfMonth = cursor.getDate();
        while (cursor <= effectiveEnd) {
          dates.push(new Date(cursor));
          // Advance to same day next month
          cursor.setMonth(cursor.getMonth() + 1);
          // Clamp to last day of month if needed
          const maxDay = new Date(
            cursor.getFullYear(),
            cursor.getMonth() + 1,
            0,
          ).getDate();
          cursor.setDate(Math.min(dayOfMonth, maxDay));
        }
        break;
      }

      case 'quarterly': {
        dates.push(...this.everyNDays(startDate, effectiveEnd, 90));
        break;
      }

      case 'custom_days': {
        const interval = frequencyValue ?? 1;
        dates.push(...this.everyNDays(startDate, effectiveEnd, interval));
        break;
      }

      default:
        this.logger.warn(`Unknown frequencyType: ${frequencyType}`);
    }

    return dates;
  }

  private everyNDays(startDate: Date, endDate: Date, n: number): Date[] {
    const dates: Date[] = [];
    const cursor = this.stripTime(startDate);
    while (cursor <= endDate) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + n);
    }
    return dates;
  }

  /** Returns a new Date at midnight (UTC-local) for a given date. */
  private stripTime(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
