import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { ManualTransitionDto } from './dto/transition.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { StageManagerService } from './stage-manager.service';
import { TransitionEvaluatorService } from '../pathway-engine/transition-evaluator.service';
import { Prisma } from '.prisma/client';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stageManager: StageManagerService,
    private readonly transitionEvaluator: TransitionEvaluatorService,
  ) {}

  async enroll(tenantId: string, userId: string, dto: CreateEnrollmentDto) {
    // Auto-generate a patient UUID when no master-patient-index ID is provided
    const patientId = dto.patientId ?? randomUUID();

    const pathway = await this.prisma.clinicalPathway.findFirst({
      where: { id: dto.pathwayId, tenantId, status: 'active' },
      include: {
        stages: {
          where: { stageType: 'entry' },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
    });

    if (!pathway) {
      throw new NotFoundException(
        `Active pathway ${dto.pathwayId} not found for this tenant`,
      );
    }

    const entryStage = pathway.stages[0];
    if (!entryStage) {
      throw new BadRequestException(
        `Pathway ${pathway.name} has no entry stage configured`,
      );
    }

    const today = new Date();
    const startDate = dto.startDate ? new Date(dto.startDate) : today;
    const enrollmentDate = today;

    let expectedEndDate: Date;
    if (dto.expectedEndDate) {
      expectedEndDate = new Date(dto.expectedEndDate);
    } else {
      expectedEndDate = new Date(startDate);
      expectedEndDate.setDate(
        expectedEndDate.getDate() + pathway.defaultDurationDays,
      );
    }

    const now = new Date();

    const enrollment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.patientPathwayEnrollment.create({
        data: {
          tenantId,
          patientId,
          patientDisplayName: dto.patientDisplayName,
          patientMrn: dto.patientMrn,
          patientGender: dto.patientGender,
          patientDob: dto.patientDob ? new Date(dto.patientDob) : undefined,
          pathwayId: pathway.id,
          pathwayVersion: pathway.version,
          planName: pathway.name,
          category: pathway.category,
          enrollmentDate,
          startDate,
          expectedEndDate,
          currentStageId: entryStage.id,
          currentStageEnteredAt: now,
          currentCareSetting: entryStage.careSetting !== 'any'
            ? entryStage.careSetting
            : 'outpatient',
          primaryCoordinatorId: dto.primaryCoordinatorId,
          careTeam: (dto.careTeam ?? []) as unknown as Prisma.InputJsonValue,
          status: 'active',
          athmaPatientId: dto.athmaPatientId,
          athmaProductId: dto.athmaProductId,
          notes: dto.notes,
          createdBy: userId,
        },
        include: {
          pathway: { select: { id: true, name: true, code: true, category: true } },
          currentStage: { select: { id: true, name: true, code: true, stageType: true } },
        },
      });

      await tx.patientStageHistory.create({
        data: {
          tenantId,
          enrollmentId: created.id,
          fromStageId: null,
          fromStageName: null,
          toStageId: entryStage.id,
          toStageName: entryStage.name,
          transitionType: 'initial_enrollment',
          reason: 'Patient enrolled into pathway',
          performedBy: userId,
        },
      });

      return created;
    });

    // Execute entry actions asynchronously (fire-and-forget with error logging)
    this.stageManager
      .executeEntryActions(tenantId, enrollment.id, entryStage)
      .catch((err) =>
        this.logger.error(
          `Failed to execute entry actions for enrollment ${enrollment.id}: ${err.message}`,
          err.stack,
        ),
      );

    return enrollment;
  }

  async findAll(
    tenantId: string,
    filters: {
      status?: string;
      patientId?: string;
      pathwayId?: string;
      coordinatorId?: string;
    },
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.pathwayId) where.pathwayId = filters.pathwayId;
    if (filters.coordinatorId) where.primaryCoordinatorId = filters.coordinatorId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patientPathwayEnrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          pathway: { select: { id: true, name: true, code: true, category: true } },
          currentStage: { select: { id: true, name: true, code: true, stageType: true } },
        },
      }),
      this.prisma.patientPathwayEnrollment.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id, tenantId },
      include: {
        pathway: {
          select: {
            id: true,
            name: true,
            code: true,
            category: true,
            defaultDurationDays: true,
          },
        },
        currentStage: true,
        stageHistory: {
          orderBy: { transitionedAt: 'desc' },
          include: {
            fromStage: { select: { id: true, name: true, code: true } },
            toStage: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${id} not found`);
    }

    // Append task summary counts
    const taskSummary = await this.prisma.careTask.groupBy({
      by: ['status'],
      where: { tenantId, enrollmentId: id },
      _count: { status: true },
    });

    return {
      ...enrollment,
      taskSummary: taskSummary.reduce(
        (acc, row) => {
          acc[row.status] = row._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async update(
    tenantId: string,
    id: string,
    userId: string,
    dto: UpdateEnrollmentDto,
  ) {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id, tenantId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${id} not found`);
    }

    return this.prisma.patientPathwayEnrollment.update({
      where: { id },
      data: {
        ...dto,
        careTeam: dto.careTeam !== undefined ? (dto.careTeam as any) : undefined,
        updatedBy: userId,
      },
      include: {
        pathway: { select: { id: true, name: true, code: true, category: true } },
        currentStage: { select: { id: true, name: true, code: true, stageType: true } },
      },
    });
  }

  async pause(tenantId: string, id: string, userId: string) {
    const enrollment = await this.findActiveEnrollment(tenantId, id);

    return this.prisma.patientPathwayEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'paused',
        statusReason: 'Paused by coordinator',
        updatedBy: userId,
      },
    });
  }

  async resume(tenantId: string, id: string, userId: string) {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id, tenantId, status: 'paused' },
    });

    if (!enrollment) {
      throw new NotFoundException(
        `Paused enrollment ${id} not found`,
      );
    }

    return this.prisma.patientPathwayEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'active',
        statusReason: null,
        updatedBy: userId,
      },
    });
  }

  async cancel(
    tenantId: string,
    id: string,
    userId: string,
    reason: string,
  ) {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id, tenantId, status: { in: ['active', 'paused'] } },
    });

    if (!enrollment) {
      throw new NotFoundException(
        `Active or paused enrollment ${id} not found`,
      );
    }

    return this.prisma.patientPathwayEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'cancelled',
        statusReason: reason,
        actualEndDate: new Date(),
        updatedBy: userId,
      },
    });
  }

  async manualTransition(
    tenantId: string,
    id: string,
    userId: string,
    dto: ManualTransitionDto,
  ) {
    const enrollment = await this.findActiveEnrollment(tenantId, id);

    // Validate toStageId belongs to the same pathway
    const targetStage = await this.prisma.pathwayStage.findFirst({
      where: {
        id: dto.toStageId,
        tenantId,
        pathwayId: enrollment.pathwayId,
      },
    });

    if (!targetStage) {
      throw new BadRequestException(
        `Stage ${dto.toStageId} does not belong to pathway ${enrollment.pathwayId}`,
      );
    }

    const previousStage = await this.prisma.pathwayStage.findUnique({
      where: { id: enrollment.currentStageId },
    });

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.patientStageHistory.create({
        data: {
          tenantId,
          enrollmentId: enrollment.id,
          fromStageId: enrollment.currentStageId,
          fromStageName: previousStage?.name ?? 'Unknown',
          toStageId: targetStage.id,
          toStageName: targetStage.name,
          transitionType: 'manual',
          reason: dto.reason,
          performedBy: userId,
        },
      });

      return tx.patientPathwayEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStageId: targetStage.id,
          previousStageId: enrollment.currentStageId,
          currentStageEnteredAt: now,
          currentCareSetting:
            targetStage.careSetting !== 'any'
              ? targetStage.careSetting
              : enrollment.currentCareSetting,
          updatedBy: userId,
        },
        include: {
          pathway: { select: { id: true, name: true, code: true, category: true } },
          currentStage: true,
        },
      });
    });

    // Execute exit actions on old stage, entry actions on new stage
    if (previousStage) {
      this.stageManager
        .executeExitActions(tenantId, enrollment.id, previousStage)
        .catch((err) =>
          this.logger.error(
            `Failed exit actions for stage ${previousStage.id}: ${err.message}`,
            err.stack,
          ),
        );
    }

    this.stageManager
      .executeEntryActions(tenantId, enrollment.id, targetStage)
      .catch((err) =>
        this.logger.error(
          `Failed entry actions for stage ${targetStage.id}: ${err.message}`,
          err.stack,
        ),
      );

    return updated;
  }

  async complete(tenantId: string, id: string, userId: string, reason?: string) {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id, tenantId, status: { in: ['active', 'paused'] } },
    });

    if (!enrollment) {
      throw new NotFoundException(`Active or paused enrollment ${id} not found`);
    }

    return this.prisma.patientPathwayEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'completed',
        statusReason: reason ?? 'Pathway completed',
        actualEndDate: new Date(),
        updatedBy: userId,
      },
      include: {
        pathway: { select: { id: true, name: true, code: true, category: true } },
        currentStage: { select: { id: true, name: true, code: true, stageType: true } },
      },
    });
  }

  async getStageHistory(tenantId: string, enrollmentId: string) {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id: enrollmentId, tenantId },
      select: { id: true },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }

    return this.prisma.patientStageHistory.findMany({
      where: { tenantId, enrollmentId },
      include: {
        fromStage: { select: { id: true, name: true, code: true, stageType: true } },
        toStage: { select: { id: true, name: true, code: true, stageType: true } },
        transitionRule: { select: { id: true, ruleName: true, triggerType: true } },
      },
      orderBy: { transitionedAt: 'desc' },
    });
  }

  async getProposedTransitions(tenantId: string, enrollmentId: string) {
    return this.transitionEvaluator.evaluateForEnrollment(tenantId, enrollmentId);
  }

  private async findActiveEnrollment(tenantId: string, id: string) {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id, tenantId, status: 'active' },
    });

    if (!enrollment) {
      throw new NotFoundException(`Active enrollment ${id} not found`);
    }

    return enrollment;
  }
}
