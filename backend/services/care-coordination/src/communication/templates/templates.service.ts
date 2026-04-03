import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaEngagementService } from '../../database/prisma-engagement.service';
import { CreateTemplateDto } from '../dto/create-template.dto';

export interface TemplateFilters {
  channel?: string;
  category?: string;
  status?: string;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly prismaEngagement: PrismaEngagementService) {}

  /**
   * Create a new template in draft status with version 1.
   */
  async create(
    tenantId: string,
    userId: string,
    dto: CreateTemplateDto,
  ) {
    // Determine the next version number for this code+channel+language combination
    const existing = await this.prismaEngagement.communicationTemplate.findMany({
      where: {
        tenantId,
        code: dto.code,
        channel: dto.channel,
        language: dto.language ?? 'en',
      },
      select: { version: true },
      orderBy: { version: 'desc' },
      take: 1,
    });

    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

    return this.prismaEngagement.communicationTemplate.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        channel: dto.channel,
        language: dto.language ?? 'en',
        subject: dto.subject ?? null,
        bodyTemplate: dto.bodyTemplate,
        variables: (dto.variables as any) ?? null,
        category: dto.category,
        version: nextVersion,
        status: 'draft',
        createdBy: userId,
      },
    });
  }

  /**
   * List templates for a tenant with optional filters.
   */
  async findAll(tenantId: string, filters: TemplateFilters = {}) {
    const where: any = { tenantId };
    if (filters.channel) where.channel = filters.channel;
    if (filters.category) where.category = filters.category;
    if (filters.status) where.status = filters.status;

    return this.prismaEngagement.communicationTemplate.findMany({
      where,
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
  }

  /**
   * Get a single template by id.
   */
  async findOne(tenantId: string, id: string) {
    const template = await this.prismaEngagement.communicationTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  /**
   * Approve a template — transitions status from any state to 'approved'.
   */
  async approve(tenantId: string, id: string, userId: string) {
    await this.findOne(tenantId, id);

    return this.prismaEngagement.communicationTemplate.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Look up the latest approved version of a template by code + channel + language.
   * Returns null if not found.
   */
  async findByCode(
    tenantId: string,
    code: string,
    channel: string,
    language: string,
  ) {
    const template = await this.prismaEngagement.communicationTemplate.findFirst({
      where: {
        tenantId,
        code,
        channel,
        language,
        status: 'approved',
      },
      orderBy: { version: 'desc' },
    });

    return template ?? null;
  }
}
