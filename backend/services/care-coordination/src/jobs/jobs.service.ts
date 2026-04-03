import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../node_modules/.prisma/client-core';
import { PrismaCoreService } from '../database/prisma-core.service';
import { v4 as uuidv4 } from 'uuid';

export interface EnqueueOptions {
  runAt?: Date;
  patientId?: string;
  enrollmentId?: string;
  taskId?: string;
  idempotencyKey?: string;
  maxAttempts?: number;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaCoreService) {}

  /**
   * Enqueue a new job. Uses upsert on (tenantId, idempotencyKey) to prevent
   * duplicate entries for the same logical operation.
   */
  async enqueue(
    tenantId: string,
    jobType: string,
    payload: Record<string, unknown>,
    opts: EnqueueOptions = {},
  ) {
    const idempotencyKey =
      opts.idempotencyKey ?? `${tenantId}:${jobType}:${uuidv4()}`;
    const runAt = opts.runAt ?? new Date();

    const job = await this.prisma.padmaJob.upsert({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      create: {
        tenantId,
        jobType,
        payload: payload as any,
        patientId: opts.patientId ?? null,
        enrollmentId: opts.enrollmentId ?? null,
        taskId: opts.taskId ?? null,
        runAt,
        status: 'READY',
        attempts: 0,
        maxAttempts: opts.maxAttempts ?? 3,
        idempotencyKey,
      },
      update: {
        // If a duplicate is found (same idempotency key), leave it untouched —
        // the original job is the authoritative record.
      },
    });

    return job;
  }

  /**
   * Atomically claim up to `batchSize` READY jobs using FOR UPDATE SKIP LOCKED.
   * Returns the claimed jobs with status set to RUNNING.
   */
  async dequeue(workerId: string, batchSize = 10) {
    const now = new Date();

    // Raw SQL: atomically select and lock eligible jobs
    const jobs = await this.prisma.$queryRaw<any[]>(
      Prisma.sql`
        UPDATE padma_jobs
        SET
          status   = 'RUNNING',
          locked_at = ${now},
          locked_by = ${workerId},
          attempts  = attempts + 1,
          updated_at = ${now}
        WHERE id IN (
          SELECT id
          FROM padma_jobs
          WHERE status = 'READY'
            AND run_at <= ${now}
            AND attempts < max_attempts
          ORDER BY run_at ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `,
    );

    return jobs;
  }

  /**
   * Mark a job as DONE and clear the lock fields.
   */
  async complete(id: string): Promise<void> {
    await this.prisma.padmaJob.update({
      where: { id },
      data: {
        status: 'DONE',
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  /**
   * Mark a job as failed. If attempts < maxAttempts, reschedule with
   * exponential backoff; otherwise mark as DEAD.
   */
  async fail(id: string, error: string): Promise<void> {
    const job = await this.prisma.padmaJob.findUnique({ where: { id } });

    if (!job) {
      this.logger.warn(`Tried to fail unknown job ${id}`);
      return;
    }

    if (job.attempts < job.maxAttempts) {
      // Exponential backoff: 2^attempt minutes
      const backoffMinutes = Math.pow(2, job.attempts);
      const nextRunAt = new Date();
      nextRunAt.setMinutes(nextRunAt.getMinutes() + backoffMinutes);

      await this.prisma.padmaJob.update({
        where: { id },
        data: {
          status: 'READY',
          lockedAt: null,
          lockedBy: null,
          lastError: error,
          runAt: nextRunAt,
        },
      });
    } else {
      await this.prisma.padmaJob.update({
        where: { id },
        data: {
          status: 'DEAD',
          lockedAt: null,
          lockedBy: null,
          lastError: error,
        },
      });

      this.logger.error(
        `Job ${id} (type=${job.jobType}) permanently failed after ${job.attempts} attempts: ${error}`,
      );
    }
  }

  /**
   * Mark a job as SKIPPED (e.g. it became irrelevant before execution).
   */
  async skip(id: string): Promise<void> {
    await this.prisma.padmaJob.update({
      where: { id },
      data: {
        status: 'SKIPPED',
        lockedAt: null,
        lockedBy: null,
      },
    });
  }
}
