import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    return tenant;
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    await this.findOne(tenantId);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
  }

  async getFeatureFlags(tenantId: string): Promise<Record<string, boolean>> {
    const tenant = await this.findOne(tenantId);
    return (tenant.featureFlags ?? {}) as Record<string, boolean>;
  }
}
