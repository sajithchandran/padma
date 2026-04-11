import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCareTaskTemplateDto } from './dto/create-care-task-template.dto';
import { UpdateCareTaskTemplateDto } from './dto/update-care-task-template.dto';

@Injectable()
export class CareTaskTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    filters: { q?: string; interventionType?: string; careSetting?: string; activeOnly?: boolean },
  ) {
    const where: any = { tenantId };

    if (filters.activeOnly !== false) {
      where.isActive = true;
    }
    if (filters.interventionType) {
      where.interventionType = filters.interventionType;
    }
    if (filters.careSetting) {
      where.careSetting = filters.careSetting;
    }
    if (filters.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { defaultOwnerRole: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.careTaskTemplate.findMany({
      where,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(tenantId: string, userId: string, dto: CreateCareTaskTemplateDto) {
    return this.prisma.careTaskTemplate.create({
      data: {
        tenantId,
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const template = await this.prisma.careTaskTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException(`Care task template ${id} not found`);
    }

    return template;
  }

  async update(tenantId: string, id: string, userId: string, dto: UpdateCareTaskTemplateDto) {
    await this.findOne(tenantId, id);

    return this.prisma.careTaskTemplate.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    await this.prisma.careTaskTemplate.delete({ where: { id } });
    return { deleted: true };
  }
}
