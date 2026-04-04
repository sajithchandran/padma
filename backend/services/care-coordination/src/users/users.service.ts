import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaCoreService } from '../database/prisma-core.service';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaCoreService) {}

  async findAll(tenantId: string) {
    const memberships = await this.prisma.userTenantRole.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: { select: { id: true, email: true, displayName: true, firstName: true, lastName: true, status: true, lastLoginAt: true } },
        role: { select: { id: true, code: true, name: true } },
      },
      orderBy: { grantedAt: 'desc' },
    });

    return memberships.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      displayName: m.user.displayName,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      status: m.user.status,
      lastLoginAt: m.user.lastLoginAt,
      roleId: m.role.id,
      roleCode: m.role.code,
      roleName: m.role.name,
      facilityId: m.facilityId,
      grantedAt: m.grantedAt,
    }));
  }

  async findOne(tenantId: string, userId: string) {
    const membership = await this.prisma.userTenantRole.findFirst({
      where: { tenantId, userId, isActive: true },
      include: {
        user: true,
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!membership) {
      throw new NotFoundException(`User ${userId} not found in this tenant`);
    }

    return {
      ...membership.user,
      roleId: membership.role.id,
      roleCode: membership.role.code,
      roleName: membership.role.name,
      permissions: membership.role.permissions.map((rp) => rp.permission.code),
      facilityId: membership.facilityId,
    };
  }

  async assignRole(tenantId: string, userId: string, dto: AssignRoleDto, grantedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException(`Role ${dto.roleId} not found`);

    // Verify role belongs to this tenant or is a system role
    if (role.tenantId !== null && role.tenantId !== tenantId) {
      throw new ConflictException('Role does not belong to this tenant');
    }

    return this.prisma.userTenantRole.upsert({
      where: { uq_user_tenant_role: { userId, tenantId } },
      update: { roleId: dto.roleId, facilityId: dto.facilityId ?? null, isActive: true, grantedBy, revokedAt: null },
      create: { userId, tenantId, roleId: dto.roleId, facilityId: dto.facilityId ?? null, isActive: true, grantedBy },
    });
  }

  async revokeRole(tenantId: string, userId: string) {
    const membership = await this.prisma.userTenantRole.findFirst({
      where: { tenantId, userId, isActive: true },
    });
    if (!membership) throw new NotFoundException(`User ${userId} has no active role in this tenant`);

    return this.prisma.userTenantRole.update({
      where: { id: membership.id },
      data: { isActive: false, revokedAt: new Date() },
    });
  }

  async upsertFromJwt(oidcSub: string, claims: { email: string; displayName?: string; firstName?: string; lastName?: string; picture?: string }) {
    return this.prisma.user.upsert({
      where: { oidcSub },
      update: {
        email: claims.email,
        displayName: claims.displayName,
        firstName: claims.firstName,
        lastName: claims.lastName,
        avatarUrl: claims.picture,
        lastLoginAt: new Date(),
      },
      create: {
        oidcSub,
        email: claims.email,
        displayName: claims.displayName,
        firstName: claims.firstName,
        lastName: claims.lastName,
        avatarUrl: claims.picture,
        status: 'ACTIVE',
      },
    });
  }
}
