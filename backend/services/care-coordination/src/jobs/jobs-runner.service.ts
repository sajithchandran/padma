import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { TaskGeneratorService } from '../tasks/task-generator.service';
import { TasksService } from '../tasks/tasks.service';
import { TransitionEvaluatorService } from '../pathway-engine/transition-evaluator.service';

@Injectable()
export class JobsRunnerService {
  private readonly logger = new Logger(JobsRunnerService.name);
  private isRunning = false;

  constructor(
    private readonly jobsService: JobsService,
    private readonly taskGenerator: TaskGeneratorService,
    private readonly tasksService: TasksService,
    private readonly transitionEvaluator: TransitionEvaluatorService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Main job loop — polls the queue every 30 seconds.
   * Uses a `isRunning` guard to prevent concurrent execution.
   */
  @Cron('*/30 * * * * *')
  async runJobs(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('Job runner already executing, skipping this tick');
      return;
    }

    this.isRunning = true;

    try {
      const jobs = await this.jobsService.dequeue('worker-1', 10);

      if (jobs.length === 0) return;

      this.logger.log(`Dequeued ${jobs.length} job(s)`);

      await Promise.allSettled(
        jobs.map((job) => this.executeJob(job)),
      );
    } catch (err) {
      this.logger.error(
        `Job runner top-level error: ${(err as Error).message}`,
        (err as Error).stack,
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Daily cron at 2 AM — extends task windows for all active enrollments.
   * In dev mode, uses a hardcoded tenantId from config (PADMA_DEV_TENANT_ID).
   */
  @Cron('0 2 * * *')
  async extendTaskWindows(): Promise<void> {
    this.logger.log('Running nightly task window extension');

    const devTenantId = this.config.get<string>('app.devTenantId');

    if (devTenantId) {
      // Development: single hardcoded tenant
      try {
        await this.taskGenerator.extendWindowForActiveEnrollments(devTenantId);
        this.logger.log(
          `Task window extension complete for tenant ${devTenantId}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to extend task windows for tenant ${devTenantId}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    } else {
      this.logger.warn(
        'PADMA_DEV_TENANT_ID not set — skipping task window extension',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Job dispatcher
  // ---------------------------------------------------------------------------

  private async executeJob(job: any): Promise<void> {
    const jobId: string = job.id;
    const jobType: string = job.job_type ?? job.jobType;
    const payload: Record<string, unknown> = job.payload ?? {};
    const tenantId: string = job.tenant_id ?? job.tenantId;
    const enrollmentId: string | null =
      job.enrollment_id ?? job.enrollmentId ?? null;

    try {
      switch (jobType) {
        case 'GENERATE_TASKS': {
          const { stageId, windowDays } = payload as {
            stageId: string;
            windowDays?: number;
          };

          if (!enrollmentId || !stageId) {
            throw new Error(
              `GENERATE_TASKS requires enrollmentId and payload.stageId`,
            );
          }

          await this.taskGenerator.generateTasksForStage(
            tenantId,
            enrollmentId,
            stageId,
            windowDays,
          );
          break;
        }

        case 'EVALUATE_TRANSITIONS': {
          if (!enrollmentId) {
            throw new Error(`EVALUATE_TRANSITIONS requires enrollmentId`);
          }

          await this.transitionEvaluator.evaluateForEnrollment(
            tenantId,
            enrollmentId,
          );
          break;
        }

        case 'ADHERENCE_RECALC': {
          if (!enrollmentId) {
            throw new Error(`ADHERENCE_RECALC requires enrollmentId`);
          }

          await this.tasksService.recalculateAdherence(tenantId, enrollmentId);
          break;
        }

        case 'SEND_REMINDER': {
          const taskId = job.task_id ?? job.taskId;
          this.logger.log(
            `TODO: reminder — tenant=${tenantId} taskId=${taskId}`,
          );
          break;
        }

        default:
          this.logger.warn(`Unknown job type: ${jobType} (id=${jobId})`);
          await this.jobsService.skip(jobId);
          return;
      }

      await this.jobsService.complete(jobId);
      this.logger.debug(`Job ${jobId} (${jobType}) completed successfully`);
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      this.logger.error(
        `Job ${jobId} (${jobType}) failed: ${message}`,
        (err as Error).stack,
      );
      await this.jobsService.fail(jobId, message);
    }
  }
}
