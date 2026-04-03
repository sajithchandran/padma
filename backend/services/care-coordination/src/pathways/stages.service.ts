import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaCoreService } from '../database/prisma-core.service';
import { CreateStageDto } from './dto/create-stage.dto';

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaCoreService) {}

  async create(tenantId: string, pathwayId: string, dto: CreateStageDto) {
    await this.ensurePathwayExists(tenantId, pathwayId);

    return this.prisma.pathwayStage.create({
      data: {
        tenantId,
        pathwayId,
        ...dto,
      },
      include: { interventionTemplates: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async update(tenantId: string, pathwayId: string, stageId: string, dto: Partial<CreateStageDto>) {
    await this.ensureStageExists(tenantId, pathwayId, stageId);

    return this.prisma.pathwayStage.update({
      where: { id: stageId },
      data: dto,
      include: { interventionTemplates: { orderBy: { sortOrder: 'asc' } } },
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
