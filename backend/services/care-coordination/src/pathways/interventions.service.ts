import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';

@Injectable()
export class InterventionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByStage(tenantId: string, stageId: string) {
    await this.ensureStageExists(tenantId, stageId);

    return this.prisma.stageInterventionTemplate.findMany({
      where: { stageId, tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(tenantId: string, stageId: string, dto: CreateInterventionDto) {
    await this.ensureStageExists(tenantId, stageId);

    return this.prisma.stageInterventionTemplate.create({
      data: {
        tenantId,
        stageId,
        ...dto,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const intervention = await this.prisma.stageInterventionTemplate.findFirst({
      where: { id, tenantId },
      include: {
        stage: { select: { id: true, name: true, code: true, stageType: true, pathwayId: true } },
      },
    });

    if (!intervention) {
      throw new NotFoundException(`Intervention template ${id} not found`);
    }

    return intervention;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateInterventionDto>) {
    await this.ensureInterventionExists(tenantId, id);

    return this.prisma.stageInterventionTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.ensureInterventionExists(tenantId, id);

    await this.prisma.stageInterventionTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureStageExists(tenantId: string, stageId: string) {
    const stage = await this.prisma.pathwayStage.findFirst({
      where: { id: stageId, tenantId },
    });
    if (!stage) {
      throw new NotFoundException(`Stage ${stageId} not found`);
    }
    return stage;
  }

  private async ensureInterventionExists(tenantId: string, id: string) {
    const intervention = await this.prisma.stageInterventionTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!intervention) {
      throw new NotFoundException(`Intervention template ${id} not found`);
    }
    return intervention;
  }
}
