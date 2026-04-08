import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTransitionRuleDto } from './dto/create-transition-rule.dto';

@Injectable()
export class TransitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByPathway(tenantId: string, pathwayId: string) {
    await this.ensurePathwayExists(tenantId, pathwayId);

    return this.prisma.stageTransitionRule.findMany({
      where: { pathwayId, tenantId },
      include: {
        fromStage: { select: { id: true, name: true, code: true, stageType: true } },
        toStage: { select: { id: true, name: true, code: true, stageType: true } },
      },
      orderBy: { priority: 'asc' },
    });
  }

  async create(tenantId: string, pathwayId: string, dto: CreateTransitionRuleDto) {
    await this.ensurePathwayExists(tenantId, pathwayId);

    return this.prisma.stageTransitionRule.create({
      data: {
        tenantId,
        pathwayId,
        ...dto,
      },
      include: {
        fromStage: { select: { id: true, name: true, code: true, stageType: true } },
        toStage: { select: { id: true, name: true, code: true, stageType: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const rule = await this.prisma.stageTransitionRule.findFirst({
      where: { id, tenantId },
      include: {
        fromStage: { select: { id: true, name: true, code: true, stageType: true } },
        toStage: { select: { id: true, name: true, code: true, stageType: true } },
      },
    });

    if (!rule) {
      throw new NotFoundException(`Transition rule ${id} not found`);
    }

    return rule;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateTransitionRuleDto>) {
    await this.ensureTransitionExists(tenantId, id);

    return this.prisma.stageTransitionRule.update({
      where: { id },
      data: dto,
      include: {
        fromStage: { select: { id: true, name: true, code: true, stageType: true } },
        toStage: { select: { id: true, name: true, code: true, stageType: true } },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.ensureTransitionExists(tenantId, id);

    await this.prisma.stageTransitionRule.delete({ where: { id } });
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

  private async ensureTransitionExists(tenantId: string, id: string) {
    const rule = await this.prisma.stageTransitionRule.findFirst({
      where: { id, tenantId },
    });
    if (!rule) {
      throw new NotFoundException(`Transition rule ${id} not found`);
    }
    return rule;
  }
}
