import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { EscalationService } from './escalation.service';

@Injectable()
export class EscalationScannerService {
  private readonly logger = new Logger(EscalationScannerService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly escalationService: EscalationService,
  ) {}

  /**
   * Runs every hour. Finds overdue tasks and evaluates them against all active
   * escalation rules, firing appropriate chain steps.
   */
  @Cron('0 * * * *')
  async scanForEscalations(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('scanForEscalations skipped — previous run still active');
      return;
    }

    this.isRunning = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const terminalStatuses = ['completed', 'auto_completed', 'skipped', 'cancelled'];

      // Process in batches of 50 to avoid excessive memory usage
      const batchSize = 50;
      let cursor: string | undefined;
      let processed = 0;

      while (true) {
        const tasks = await this.prisma.careTask.findMany({
          where: {
            status: { notIn: terminalStatuses },
            dueDate: { lt: today },
            ...(cursor ? { id: { gt: cursor } } : {}),
          },
          take: batchSize,
          orderBy: { id: 'asc' },
          select: {
            id: true,
            tenantId: true,
            patientId: true,
            enrollmentId: true,
            dueDate: true,
            priority: true,
            isCritical: true,
            escalationLevel: true,
            status: true,
            enrollment: {
              select: { adherencePercent: true },
            },
          },
        });

        if (tasks.length === 0) {
          break;
        }

        for (const task of tasks) {
          try {
            await this.escalationService.evaluateForTask(task.tenantId, {
              id: task.id,
              tenantId: task.tenantId,
              patientId: task.patientId,
              enrollmentId: task.enrollmentId,
              dueDate: task.dueDate,
              priority: task.priority,
              isCritical: task.isCritical,
              escalationLevel: task.escalationLevel,
              status: task.status,
              enrollment: task.enrollment
                ? {
                    adherencePercent:
                      task.enrollment.adherencePercent !== null
                        ? Number(task.enrollment.adherencePercent)
                        : null,
                  }
                : null,
            });
          } catch (err: any) {
            this.logger.error(
              `Failed to evaluate escalation for task ${task.id}: ${err?.message}`,
              err?.stack,
            );
          }
        }

        processed += tasks.length;
        cursor = tasks[tasks.length - 1].id;

        if (tasks.length < batchSize) {
          break;
        }
      }

      if (processed > 0) {
        this.logger.log(`scanForEscalations processed ${processed} overdue task(s)`);
      }
    } catch (err: any) {
      this.logger.error(
        `scanForEscalations encountered a fatal error: ${err?.message}`,
        err?.stack,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
