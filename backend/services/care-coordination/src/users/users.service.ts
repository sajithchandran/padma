import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateAssignableRole(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);
    if (role.tenantId !== null && role.tenantId !== tenantId) {
      throw new ConflictException('Role does not belong to this tenant');
    }
    return role;
  }

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

  async create(tenantId: string, createdBy: string, dto: CreateUserDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    await this.validateAssignableRole(tenantId, dto.roleId);

    const displayName = dto.displayName?.trim()
      || [dto.firstName?.trim(), dto.lastName?.trim()].filter(Boolean).join(' ').trim()
      || normalizedEmail;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const user = existingUser
      ? await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: normalizedEmail,
            firstName: dto.firstName?.trim() || existingUser.firstName,
            lastName: dto.lastName?.trim() || existingUser.lastName,
            displayName,
            status: existingUser.status === 'DEACTIVATED' ? 'ACTIVE' : existingUser.status,
          },
        })
      : await this.prisma.user.create({
          data: {
            oidcSub: `local:${normalizedEmail}`,
            email: normalizedEmail,
            firstName: dto.firstName?.trim() || null,
            lastName: dto.lastName?.trim() || null,
            displayName,
            status: 'ACTIVE',
          },
        });

    await this.assignRole(tenantId, user.id, {
      roleId: dto.roleId,
      facilityId: dto.facilityId,
    }, createdBy);

    return this.findOne(tenantId, user.id);
  }

  async assignRole(tenantId: string, userId: string, dto: AssignRoleDto, grantedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    await this.validateAssignableRole(tenantId, dto.roleId);

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
