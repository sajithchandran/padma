import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../node_modules/.prisma/client-core';
import { PrismaCoreService } from '../database/prisma-core.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

export interface TaskFilters {
  patientId?: string;
  enrollmentId?: string;
  stageId?: string;
  status?: string;
  assignedToUserId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  careSetting?: string;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaCoreService) {}

  async findAll(
    tenantId: string,
    filters: TaskFilters,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'dueDate',
      sortOrder = 'asc',
    } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.enrollmentId) where.enrollmentId = filters.enrollmentId;
    if (filters.stageId) where.stageId = filters.stageId;
    if (filters.status) where.status = filters.status;
    if (filters.assignedToUserId) where.assignedToUserId = filters.assignedToUserId;
    if (filters.careSetting) where.careSetting = filters.careSetting;
    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) where.dueDate.gte = filters.dueDateFrom;
      if (filters.dueDateTo) where.dueDate.lte = filters.dueDateTo;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.careTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          interventionTemplate: {
            select: { id: true, name: true, interventionType: true },
          },
        },
      }),
      this.prisma.careTask.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const task = await this.prisma.careTask.findFirst({
      where: { id, tenantId },
      include: {
        taskEvents: {
          orderBy: { createdAt: 'desc' },
        },
        interventionTemplate: {
          select: { id: true, name: true, interventionType: true, reminderConfig: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  async findForPatient360(
    tenantId: string,
    patientId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where = { tenantId, patientId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.careTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          interventionTemplate: {
            select: { id: true, name: true, interventionType: true },
          },
        },
      }),
      this.prisma.careTask.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async complete(
    tenantId: string,
    id: string,
    userId: string,
    dto: { completionNotes?: string; completionMethod?: string; completionEvidence?: Record<string, unknown> },
  ) {
    const task = await this.findTaskOrThrow(tenantId, id);

    if (['completed', 'cancelled'].includes(task.status)) {
      throw new BadRequestException(
        `Task ${id} is already ${task.status} and cannot be completed`,
      );
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.careTask.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: now,
          completedBy: userId,
          completionMethod: dto.completionMethod ?? 'manual',
          completionNotes: dto.completionNotes ?? null,
          completionEvidence: (dto.completionEvidence as any) ?? null,
          updatedBy: userId,
        },
      }),
      this.prisma.careTaskEvent.create({
        data: {
          tenantId,
          taskId: id,
          eventType: 'status_changed',
          fromStatus: task.status,
          toStatus: 'completed',
          payload: {
            completionMethod: dto.completionMethod ?? 'manual',
            completionNotes: dto.completionNotes,
          },
          performedBy: userId,
        },
      }),
    ]);

    // Fire-and-forget adherence recalculation
    this.recalculateAdherence(tenantId, task.enrollmentId).catch((err) =>
      this.logger.error(
        `Failed to recalculate adherence for enrollment ${task.enrollmentId}: ${err.message}`,
        err.stack,
      ),
    );

    return this.findOne(tenantId, id);
  }

  async skip(
    tenantId: string,
    id: string,
    userId: string,
    reason: string,
  ) {
    const task = await this.findTaskOrThrow(tenantId, id);

    if (['completed', 'cancelled', 'skipped'].includes(task.status)) {
      throw new BadRequestException(
        `Task ${id} cannot be skipped from status '${task.status}'`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.careTask.update({
        where: { id },
        data: { status: 'skipped', updatedBy: userId },
      }),
      this.prisma.careTaskEvent.create({
        data: {
          tenantId,
          taskId: id,
          eventType: 'status_changed',
          fromStatus: task.status,
          toStatus: 'skipped',
          payload: { reason },
          performedBy: userId,
        },
      }),
    ]);

    return this.findOne(tenantId, id);
  }

  async cancel(
    tenantId: string,
    id: string,
    userId: string,
    reason: string,
  ) {
    const task = await this.findTaskOrThrow(tenantId, id);

    if (task.status === 'cancelled') {
      throw new BadRequestException(`Task ${id} is already cancelled`);
    }

    await this.prisma.$transaction([
      this.prisma.careTask.update({
        where: { id },
        data: { status: 'cancelled', updatedBy: userId },
      }),
      this.prisma.careTaskEvent.create({
        data: {
          tenantId,
          taskId: id,
          eventType: 'status_changed',
          fromStatus: task.status,
          toStatus: 'cancelled',
          payload: { reason },
          performedBy: userId,
        },
      }),
    ]);

    return this.findOne(tenantId, id);
  }

  async escalate(tenantId: string, id: string, userId: string) {
    const task = await this.findTaskOrThrow(tenantId, id);
    const now = new Date();
    const newLevel = task.escalationLevel + 1;

    await this.prisma.$transaction([
      this.prisma.careTask.update({
        where: { id },
        data: {
          escalationLevel: newLevel,
          lastEscalatedAt: now,
          updatedBy: userId,
        },
      }),
      this.prisma.careTaskEvent.create({
        data: {
          tenantId,
          taskId: id,
          eventType: 'escalated',
          fromStatus: task.status,
          toStatus: task.status,
          payload: { escalationLevel: newLevel },
          performedBy: userId,
        },
      }),
    ]);

    return this.findOne(tenantId, id);
  }

  async reassign(
    tenantId: string,
    id: string,
    userId: string,
    assignedToUserId: string | null,
    assignedToRole: string | null,
  ) {
    const task = await this.findTaskOrThrow(tenantId, id);

    await this.prisma.$transaction([
      this.prisma.careTask.update({
        where: { id },
        data: {
          assignedToUserId,
          assignedToRole,
          updatedBy: userId,
        },
      }),
      this.prisma.careTaskEvent.create({
        data: {
          tenantId,
          taskId: id,
          eventType: 'assigned',
          fromStatus: task.status,
          toStatus: task.status,
          payload: {
            previousAssignedToUserId: task.assignedToUserId,
            previousAssignedToRole: task.assignedToRole,
            assignedToUserId,
            assignedToRole,
          },
          performedBy: userId,
        },
      }),
    ]);

    return this.findOne(tenantId, id);
  }

  /**
   * Bulk auto-complete tasks (called by auto-completion service when external
   * events arrive matching autoCompleteEventType).
   */
  async autoComplete(
    tenantId: string,
    taskIds: string[],
    completionMethod: string,
    evidence: Record<string, unknown>,
  ): Promise<void> {
    if (taskIds.length === 0) return;

    const now = new Date();

    // Fetch tasks to record from/to status in events
    const tasks = await this.prisma.careTask.findMany({
      where: { tenantId, id: { in: taskIds }, status: { notIn: ['completed', 'cancelled'] } },
      select: { id: true, status: true, enrollmentId: true },
    });

    if (tasks.length === 0) return;

    const eligibleIds = tasks.map((t) => t.id);

    await this.prisma.$transaction([
      this.prisma.careTask.updateMany({
        where: { id: { in: eligibleIds } },
        data: {
          status: 'completed',
          completedAt: now,
          completionMethod,
          completionEvidence: evidence as any,
        },
      }),
      this.prisma.careTaskEvent.createMany({
        data: tasks.map((task) => ({
          tenantId,
          taskId: task.id,
          eventType: 'auto_completed',
          fromStatus: task.status,
          toStatus: 'completed',
          payload: { completionMethod, evidence } as unknown as Prisma.InputJsonValue,
        })),
      }),
    ]);

    // Recalculate adherence for unique enrollments
    const enrollmentIds = [...new Set(tasks.map((t) => t.enrollmentId))];
    for (const enrollmentId of enrollmentIds) {
      this.recalculateAdherence(tenantId, enrollmentId).catch((err) =>
        this.logger.error(
          `Failed adherence recalc for enrollment ${enrollmentId}: ${err.message}`,
          err.stack,
        ),
      );
    }
  }

  /**
   * Recomputes totalTasks, completedTasks, overdueTasks, and adherencePercent
   * for the given enrollment and persists the result.
   */
  async recalculateAdherence(
    tenantId: string,
    enrollmentId: string,
  ): Promise<void> {
    const today = new Date();

    const [totalTasks, completedTasks, overdueTasks] = await Promise.all([
      this.prisma.careTask.count({
        where: {
          tenantId,
          enrollmentId,
          status: { notIn: ['cancelled', 'skipped'] },
        },
      }),
      this.prisma.careTask.count({
        where: { tenantId, enrollmentId, status: 'completed' },
      }),
      this.prisma.careTask.count({
        where: {
          tenantId,
          enrollmentId,
          status: { notIn: ['completed', 'cancelled', 'skipped'] },
          dueDate: { lt: today },
        },
      }),
    ]);

    const adherencePercent =
      totalTasks > 0
        ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(2))
        : null;

    await this.prisma.patientPathwayEnrollment.update({
      where: { id: enrollmentId },
      data: {
        totalTasks,
        completedTasks,
        overdueTasks,
        adherencePercent: adherencePercent !== null ? adherencePercent : undefined,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async findTaskOrThrow(tenantId: string, id: string) {
    const task = await this.prisma.careTask.findFirst({
      where: { id, tenantId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }
}
