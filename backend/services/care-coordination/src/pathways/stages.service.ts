import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';

export interface StageOrderItem {
  id: string;
  sortOrder: number;
}

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByPathway(tenantId: string, pathwayId: string) {
    await this.ensurePathwayExists(tenantId, pathwayId);

    return this.prisma.pathwayStage.findMany({
      where: { pathwayId, tenantId },
      include: {
        interventionTemplates: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { currentEnrollments: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(tenantId: string, pathwayId: string, dto: CreateStageDto) {
    await this.ensurePathwayExists(tenantId, pathwayId);

    return this.prisma.pathwayStage.create({
      data: {
        tenantId,
        pathwayId,
        ...dto,
      },
      include: {
        interventionTemplates: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async findOne(tenantId: string, pathwayId: string, stageId: string) {
    const stage = await this.prisma.pathwayStage.findFirst({
      where: { id: stageId, tenantId, pathwayId },
      include: {
        interventionTemplates: { orderBy: { sortOrder: 'asc' } },
        transitionsFrom: {
          include: {
            toStage: { select: { id: true, name: true, code: true, stageType: true } },
          },
          orderBy: { priority: 'asc' },
        },
        transitionsTo: {
          include: {
            fromStage: { select: { id: true, name: true, code: true, stageType: true } },
          },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException(`Stage ${stageId} not found in pathway ${pathwayId}`);
    }

    return stage;
  }

  async update(tenantId: string, pathwayId: string, stageId: string, dto: Partial<CreateStageDto>) {
    await this.ensureStageExists(tenantId, pathwayId, stageId);

    return this.prisma.pathwayStage.update({
      where: { id: stageId },
      data: dto,
      include: { interventionTemplates: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async reorder(tenantId: string, pathwayId: string, stages: StageOrderItem[]) {
    await this.ensurePathwayExists(tenantId, pathwayId);

    // Validate all stageIds belong to this pathway
    const existingStages = await this.prisma.pathwayStage.findMany({
      where: { pathwayId, tenantId },
      select: { id: true },
    });

    const existingIds = new Set(existingStages.map((s) => s.id));
    const invalidIds = stages.filter((s) => !existingIds.has(s.id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Stage IDs not found in pathway: ${invalidIds.map((s) => s.id).join(', ')}`,
      );
    }

    // Bulk update sort orders in a transaction
    await this.prisma.$transaction(
      stages.map(({ id, sortOrder }) =>
        this.prisma.pathwayStage.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );

    // Return the full pathway stages in new order
    return this.prisma.pathwayStage.findMany({
      where: { pathwayId, tenantId },
      include: { interventionTemplates: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async remove(tenantId: string, pathwayId: string, stageId: string) {
    await this.ensureStageExists(tenantId, pathwayId, stageId);

    await this.prisma.pathwayStage.delete({ where: { id: stageId } });
    return { deleted: true };
  }

  private async ensurePathwayExists(tenantId: string, pathwayId: string) {
    const pathway = await this.prisma.clinicalPathway.findFirst({
      where: { id: pathwayId, tenantId },
    });
    if (!pathway) {
      throw new NotFoundException(`Pathway ${pathwayId} not found`);
    }
    return pathway;
  }

  private async ensureStageExists(tenantId: string, pathwayId: string, stageId: string) {
    const stage = await this.prisma.pathwayStage.findFirst({
      where: { id: stageId, tenantId, pathwayId },
    });
    if (!stage) {
      throw new NotFoundException(`Stage ${stageId} not found in pathway ${pathwayId}`);
    }
    return stage;
  }
}
