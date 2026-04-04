import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaCoreService } from '../database/prisma-core.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaCoreService) {}

  async findAll(tenantId: string) {
    // Return system roles + this tenant's custom roles
    const roles = await this.prisma.role.findMany({
      where: {
        isActive: true,
        OR: [{ tenantId: null }, { tenantId }],
      },
      include: {
        permissions: { include: { permission: { select: { code: true, resource: true, action: true, description: true } } } },
        _count: { select: { users: { where: { tenantId, isActive: true } } } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      tenantId: r.tenantId,
      permissions: r.permissions.map((rp) => rp.permission),
      userCount: r._count.users,
    }));
  }

  async findOne(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);
    return role;
  }

  async create(tenantId: string, dto: CreateRoleDto) {
    // Check for code uniqueness within tenant
    const existing = await this.prisma.role.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) throw new ConflictException(`Role code "${dto.code}" already exists in this tenant`);

    const role = await this.prisma.role.create({
      data: { tenantId, code: dto.code, name: dto.name, description: dto.description, isSystem: false },
    });

    if (dto.permissionIds?.length) {
      await this.assignPermissions(role.id, dto.permissionIds);
    }

    return this.findOne(role.id);
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);
    if (role.isSystem) throw new ConflictException('Cannot modify permissions of a system role');

    // Replace all permissions
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });

    return this.findOne(roleId);
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }
}
