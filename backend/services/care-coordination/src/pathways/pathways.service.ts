import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePathwayDto } from './dto/create-pathway.dto';
import { UpdatePathwayDto } from './dto/update-pathway.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class PathwaysService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(value: string) {
    return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  private async generatePathwayCode(tenantId: string, category: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { featureFlags: true },
    });
    const featureFlags = (tenant?.featureFlags ?? {}) as Record<string, unknown>;
    const configuredFormat = typeof featureFlags.pathwayCodeFormat === 'string'
      ? featureFlags.pathwayCodeFormat
      : 'PW-{YYYY}-{SEQ4}';
    const now = new Date();
    const year = String(now.getFullYear());
    const categoryCode = this.normalizeCode(category || 'PATHWAY').slice(0, 6) || 'PATH';

    const sequenceCount = await this.prisma.clinicalPathway.count({ where: { tenantId } });

    for (let offset = 1; offset <= 1000; offset += 1) {
      const sequence = sequenceCount + offset;
      const code = this.normalizeCode(configuredFormat
        .replaceAll('{YYYY}', year)
        .replaceAll('{YY}', year.slice(-2))
        .replaceAll('{CATEGORY}', categoryCode)
        .replaceAll('{SEQ4}', String(sequence).padStart(4, '0'))
        .replaceAll('{SEQ3}', String(sequence).padStart(3, '0'))
        .replaceAll('{SEQ}', String(sequence)));

      const existing = await this.prisma.clinicalPathway.findFirst({
        where: { tenantId, code, version: 1 },
        select: { id: true },
      });
      if (!existing) return code;
    }

    throw new ConflictException('Unable to generate a unique pathway code. Update the tenant pathway code format.');
  }

  private async validateCareTeam(tenantId: string, careTeamId?: string | null) {
    if (!careTeamId) return null;

    const careTeam = await this.prisma.careTeam.findFirst({
      where: {
        id: careTeamId,
        tenantId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!careTeam) {
      throw new BadRequestException('Selected care team is not available for this tenant.');
    }

    return careTeam;
  }

  async create(tenantId: string, userId: string, dto: CreatePathwayDto) {
    const { stages, ...pathwayData } = dto;
    const version = 1;
    const code = pathwayData.code?.trim()
      ? this.normalizeCode(pathwayData.code)
      : await this.generatePathwayCode(tenantId, pathwayData.category);

    await this.validateCareTeam(tenantId, dto.careTeamId);

    const existing = await this.prisma.clinicalPathway.findFirst({
      where: {
        tenantId,
        code,
        version,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Pathway code "${code}" already exists for version ${version}. Use a different code or clone the existing pathway.`,
      );
    }

    return this.prisma.clinicalPathway.create({
      data: {
        tenantId,
        createdBy: userId,
        version,
        ...pathwayData,
        code,
        applicableSettings: dto.applicableSettings ?? [],
        stages: stages?.length
          ? {
              create: stages.map((stage) => ({
                tenantId,
                ...stage,
              })),
            }
          : undefined,
      },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findAll(
    tenantId: string,
    filters: { category?: string; status?: string },
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isActive: true };
    if (filters.category) where.category = filters.category;
    if (filters.status) where.status = filters.status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.clinicalPathway.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          stages: {
            select: { id: true, code: true, name: true, stageType: true, careSetting: true, sortOrder: true },
            orderBy: { sortOrder: 'asc' },
          },
          careTeam: {
            select: {
              id: true,
              name: true,
              description: true,
              _count: { select: { members: true } },
            },
          },
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.clinicalPathway.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const pathway = await this.prisma.clinicalPathway.findFirst({
      where: { id, tenantId },
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            interventionTemplates: { orderBy: { sortOrder: 'asc' } },
          },
        },
        transitions: {
          include: {
            fromStage: { select: { id: true, name: true, code: true } },
            toStage: { select: { id: true, name: true, code: true } },
          },
          orderBy: { priority: 'asc' },
        },
        careTeam: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            _count: { select: { members: true } },
          },
        },
      },
    });

    if (!pathway) {
      throw new NotFoundException(`Pathway ${id} not found`);
    }

    return pathway;
  }

  async update(tenantId: string, id: string, userId: string, dto: UpdatePathwayDto) {
    const pathway = await this.prisma.clinicalPathway.findFirst({
      where: { id, tenantId },
    });

    if (!pathway) {
      throw new NotFoundException(`Pathway ${id} not found`);
    }

    if (pathway.status === 'active') {
      throw new BadRequestException('Cannot modify an active pathway. Clone it to create a new version.');
    }

    const { stages, ...pathwayData } = dto;
    await this.validateCareTeam(tenantId, dto.careTeamId);

    return this.prisma.clinicalPathway.update({
      where: { id },
      data: {
        ...pathwayData,
        updatedBy: userId,
      },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        careTeam: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            _count: { select: { members: true } },
          },
        },
      },
    });
  }

  async publish(tenantId: string, id: string, userId: string) {
    const pathway = await this.prisma.clinicalPathway.findFirst({
      where: { id, tenantId },
      include: { stages: true },
    });

    if (!pathway) {
      throw new NotFoundException(`Pathway ${id} not found`);
    }

    if (pathway.status === 'active') {
      throw new BadRequestException('Pathway is already active');
    }

    if (pathway.stages.length === 0) {
      throw new BadRequestException('Pathway must have at least one stage before publishing');
    }

    const hasEntryStage = pathway.stages.some((s) => s.stageType === 'entry');
    if (!hasEntryStage) {
      throw new BadRequestException('Pathway must have at least one entry stage');
    }

    await this.prisma.clinicalPathway.updateMany({
      where: { tenantId, code: pathway.code, status: 'active', id: { not: id } },
      data: { status: 'deprecated', updatedBy: userId },
    });

    return this.prisma.clinicalPathway.update({
      where: { id },
      data: { status: 'active', updatedBy: userId },
    });
  }

  async softDelete(tenantId: string, id: string, userId: string) {
    const pathway = await this.prisma.clinicalPathway.findFirst({
      where: { id, tenantId },
    });

    if (!pathway) {
      throw new NotFoundException(`Pathway ${id} not found`);
    }

    if (pathway.status === 'active') {
      throw new BadRequestException(
        'Cannot delete an active pathway. Deprecate it first or clone it.',
      );
    }

    return this.prisma.clinicalPathway.update({
      where: { id },
      data: { isActive: false, updatedBy: userId },
    });
  }

  async clone(tenantId: string, id: string, userId: string) {
    const source = await this.prisma.clinicalPathway.findFirst({
      where: { id, tenantId },
      include: {
        stages: {
          include: { interventionTemplates: true },
          orderBy: { sortOrder: 'asc' },
        },
        transitions: true,
      },
    });

    if (!source) {
      throw new NotFoundException(`Pathway ${id} not found`);
    }

    const latestVersion = await this.prisma.clinicalPathway.aggregate({
      where: { tenantId, code: source.code },
      _max: { version: true },
    });
    const newVersion = (latestVersion._max.version ?? 0) + 1;

    return this.prisma.$transaction(async (tx) => {
      const cloned = await tx.clinicalPathway.create({
        data: {
          tenantId,
          code: source.code,
          name: source.name,
          description: source.description,
          category: source.category,
          applicableSettings: source.applicableSettings as any,
          version: newVersion,
          defaultDurationDays: source.defaultDurationDays,
          externalSourceSystem: source.externalSourceSystem,
          externalSourceId: source.externalSourceId,
          careTeamId: source.careTeamId,
          status: 'draft',
          createdBy: userId,
        },
      });

      const stageIdMap = new Map<string, string>();

      for (const stage of source.stages) {
        const newStage = await tx.pathwayStage.create({
          data: {
            tenantId,
            pathwayId: cloned.id,
            code: stage.code,
            name: stage.name,
            description: stage.description,
            stageType: stage.stageType,
            careSetting: stage.careSetting,
            sortOrder: stage.sortOrder,
            expectedDurationDays: stage.expectedDurationDays,
            minDurationDays: stage.minDurationDays,
            autoTransition: stage.autoTransition,
            entryActions: stage.entryActions as any,
            exitActions: stage.exitActions as any,
            metadata: stage.metadata as any,
          },
        });
        stageIdMap.set(stage.id, newStage.id);

        if (stage.interventionTemplates.length > 0) {
          await tx.stageInterventionTemplate.createMany({
            data: stage.interventionTemplates.map((t) => ({
              tenantId,
              stageId: newStage.id,
              interventionType: t.interventionType,
              name: t.name,
              description: t.description,
              careSetting: t.careSetting,
              deliveryMode: t.deliveryMode,
              frequencyType: t.frequencyType,
              frequencyValue: t.frequencyValue,
              startDayOffset: t.startDayOffset,
              endDayOffset: t.endDayOffset,
              defaultOwnerRole: t.defaultOwnerRole,
              autoCompleteSource: t.autoCompleteSource,
              autoCompleteEventType: t.autoCompleteEventType,
              priority: t.priority,
              isCritical: t.isCritical,
              reminderConfig: t.reminderConfig as any,
              metadata: t.metadata as any,
              sortOrder: t.sortOrder,
            })),
          });
        }
      }

      if (source.transitions.length > 0) {
        await tx.stageTransitionRule.createMany({
          data: source.transitions.map((tr) => ({
            tenantId,
            pathwayId: cloned.id,
            fromStageId: stageIdMap.get(tr.fromStageId)!,
            toStageId: stageIdMap.get(tr.toStageId)!,
            ruleName: tr.ruleName,
            ruleDescription: tr.ruleDescription,
            triggerType: tr.triggerType,
            conditionExpr: tr.conditionExpr as any,
            priority: tr.priority,
            isAutomatic: tr.isAutomatic,
            transitionActions: tr.transitionActions as any,
          })),
        });
      }

      return tx.clinicalPathway.findFirst({
        where: { id: cloned.id },
        include: {
          stages: { orderBy: { sortOrder: 'asc' } },
          transitions: true,
        },
      });
    });
  }
}
