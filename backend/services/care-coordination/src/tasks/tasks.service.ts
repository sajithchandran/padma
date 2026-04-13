import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '.prisma/client-core';
import { PrismaService } from '../database/prisma.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { CareChatService } from '../care-chat/care-chat.service';

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

type TaskChatContext = {
  id: string;
  tenantId: string;
  patientId: string;
  enrollmentId: string;
  stageId: string;
  title: string;
  status: string;
  assignedToUserId?: string | null;
  assignedToRole?: string | null;
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly careChat: CareChatService,
  ) {}

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

    await this.safePostTaskSystemMessage(task, 'task_completed', `Task completed: ${task.title}`, userId, {
      completionMethod: dto.completionMethod ?? 'manual',
      completionNotes: dto.completionNotes,
    });

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

    await this.safePostTaskSystemMessage(task, 'task_skipped', `Task skipped: ${task.title}.${reason ? ` Reason: ${reason}` : ''}`, userId, { reason });

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

    await this.safePostTaskSystemMessage(task, 'task_cancelled', `Task cancelled: ${task.title}.${reason ? ` Reason: ${reason}` : ''}`, userId, { reason });

    return this.findOne(tenantId, id);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    userId: string,
    status: string,
    notes?: string,
  ) {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === 'completed') {
      return this.complete(tenantId, id, userId, {
        completionNotes: notes,
        completionMethod: 'manual',
      });
    }

    if (normalizedStatus === 'skipped') {
      return this.skip(tenantId, id, userId, notes ?? 'Skipped by coordinator');
    }

    if (normalizedStatus === 'cancelled') {
      return this.cancel(tenantId, id, userId, notes ?? 'Cancelled by coordinator');
    }

    if (!['pending', 'upcoming', 'active'].includes(normalizedStatus)) {
      throw new BadRequestException(`Unsupported task status '${status}'`);
    }

    const task = await this.findTaskOrThrow(tenantId, id);

    if (['completed', 'cancelled', 'skipped'].includes(task.status)) {
      throw new BadRequestException(
        `Task ${id} is ${task.status} and cannot be moved to ${normalizedStatus}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.careTask.update({
        where: { id },
        data: {
          status: normalizedStatus,
          completionNotes: notes ?? task.completionNotes,
          updatedBy: userId,
        },
      }),
      this.prisma.careTaskEvent.create({
        data: {
          tenantId,
          taskId: id,
          eventType: 'status_changed',
          fromStatus: task.status,
          toStatus: normalizedStatus,
          payload: { notes },
          performedBy: userId,
        },
      }),
    ]);

    await this.safePostTaskSystemMessage(
      task,
      'task_status_changed',
      `Task status changed: ${task.title} moved from ${task.status} to ${normalizedStatus}.${notes ? ` Notes: ${notes}` : ''}`,
      userId,
      { fromStatus: task.status, toStatus: normalizedStatus, notes },
    );

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

    await this.safePostTaskSystemMessage(
      task,
      'task_escalated',
      `Task escalated: ${task.title} moved to escalation level ${newLevel}.`,
      userId,
      { escalationLevel: newLevel },
    );

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

    await this.safePostTaskSystemMessage(
      task,
      'task_assigned',
      assignedToUserId
        ? `Task assigned: ${task.title}.`
        : `Task assignment cleared: ${task.title}.`,
      userId,
      {
        previousAssignedToUserId: task.assignedToUserId,
        previousAssignedToRole: task.assignedToRole,
        assignedToUserId,
        assignedToRole,
      },
    );

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
      select: {
        id: true,
        tenantId: true,
        patientId: true,
        enrollmentId: true,
        stageId: true,
        status: true,
        title: true,
        assignedToUserId: true,
        assignedToRole: true,
      },
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

    for (const task of tasks) {
      this.safePostTaskSystemMessage(
        task,
        'task_auto_completed',
        `Task auto-completed: ${task.title}.`,
        null,
        { completionMethod, evidence },
      ).catch((err) =>
        this.logger.error(
          `Failed auto-complete care chat event for task ${task.id}: ${err.message}`,
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

  private async safePostTaskSystemMessage(
    task: TaskChatContext,
    eventType: string,
    body: string,
    userId?: string | null,
    metadata?: Record<string, unknown>,
  ) {
    try {
      const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
        where: { id: task.enrollmentId, tenantId: task.tenantId },
        select: { pathwayId: true },
      });

      await this.careChat.postSystemMessage({
        tenantId: task.tenantId,
        patientId: task.patientId,
        enrollmentId: task.enrollmentId,
        pathwayId: enrollment?.pathwayId,
        stageId: task.stageId,
        taskId: task.id,
        eventType,
        body,
        metadata: {
          taskId: task.id,
          title: task.title,
          fromStatus: task.status,
          ...metadata,
        },
        createdBy: userId,
      });
    } catch (err) {
      this.logger.error(
        `Failed to post care chat task event for task ${task.id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
