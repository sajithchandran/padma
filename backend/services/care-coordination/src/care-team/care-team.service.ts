import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCareTeamDto } from './dto/create-care-team.dto';
import { UpdateCareTeamDto } from './dto/update-care-team.dto';

const CARE_TEAM_ROLE_CODES = [
  'supervisor',
  'care_coordinator',
  'physician',
  'nurse',
] as const;

@Injectable()
export class CareTeamService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateMembers(
    tenantId: string,
    members: Array<{ userId: string; roleId: string; facilityId?: string }>,
  ) {
    if (members.length === 0) {
      return;
    }

    const uniqueUserIds = [...new Set(members.map((member) => member.userId))];
    if (uniqueUserIds.length !== members.length) {
      throw new ConflictException('A user can only be added once to the same care team');
    }

    const memberships = await this.prisma.userTenantRole.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: members.map((member) => ({
          userId: member.userId,
          roleId: member.roleId,
        })),
      },
      select: {
        userId: true,
        roleId: true,
      },
    });

    for (const member of members) {
      const isValid = memberships.some((membership) => (
        membership.userId === member.userId && membership.roleId === member.roleId
      ));

      if (!isValid) {
        throw new ConflictException(
          `User ${member.userId} does not have the selected active role in this tenant`,
        );
      }
    }
  }

  private mapTeam(team: any) {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      isActive: team.isActive,
      memberCount: team.members.length,
      members: team.members.map((member: any) => ({
        id: member.id,
        userId: member.user.id,
        email: member.user.email,
        displayName: member.user.displayName,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        status: member.user.status,
        roleId: member.role.id,
        roleCode: member.role.code,
        roleName: member.role.name,
        facilityId: member.facilityId,
        addedAt: member.addedAt,
      })),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  async findMembers(
    tenantId: string,
    filters: {
      roleCode?: string;
      search?: string;
      includeInactive?: boolean;
    } = {},
  ) {
    const allowedRoleCodes = filters.roleCode
      ? [filters.roleCode]
      : [...CARE_TEAM_ROLE_CODES];

    const memberships = await this.prisma.userTenantRole.findMany({
      where: {
        tenantId,
        isActive: true,
        role: {
          code: { in: allowedRoleCodes },
          isActive: true,
        },
        user: {
          status: filters.includeInactive ? undefined : 'ACTIVE',
          OR: filters.search
            ? [
                { email: { contains: filters.search, mode: 'insensitive' } },
                { displayName: { contains: filters.search, mode: 'insensitive' } },
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
              ]
            : undefined,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            firstName: true,
            lastName: true,
            status: true,
            lastLoginAt: true,
            avatarUrl: true,
          },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            isSystem: true,
          },
        },
      },
      orderBy: [
        { role: { name: 'asc' } },
        { user: { displayName: 'asc' } },
        { grantedAt: 'desc' },
      ],
    });

    return memberships.map((membership) => ({
      userId: membership.user.id,
      email: membership.user.email,
      displayName: membership.user.displayName,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      avatarUrl: membership.user.avatarUrl,
      status: membership.user.status,
      lastLoginAt: membership.user.lastLoginAt,
      roleId: membership.role.id,
      roleCode: membership.role.code,
      roleName: membership.role.name,
      roleDescription: membership.role.description,
      isSystemRole: membership.role.isSystem,
      facilityId: membership.facilityId,
      grantedAt: membership.grantedAt,
    }));
  }

  async findMember(tenantId: string, userId: string) {
    const members = await this.findMembers(tenantId, { includeInactive: true });
    const member = members.find((entry) => entry.userId === userId);

    if (!member) {
      throw new NotFoundException(`Care team member ${userId} not found in this tenant`);
    }

    return member;
  }

  async findRoles(tenantId: string) {
    const roles = await this.prisma.role.findMany({
      where: {
        isActive: true,
        code: { in: [...CARE_TEAM_ROLE_CODES] },
        OR: [{ tenantId: null }, { tenantId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            users: {
              where: {
                tenantId,
                isActive: true,
              },
            },
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      tenantId: role.tenantId,
      memberCount: role._count.users,
      careTeamEligible: true,
    }));
  }

  async findTeams(tenantId: string) {
    const teams = await this.prisma.careTeam.findMany({
      where: { tenantId, isActive: true },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                firstName: true,
                lastName: true,
                status: true,
              },
            },
            role: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: { addedAt: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return teams.map((team) => this.mapTeam(team));
  }

  async findTeam(tenantId: string, teamId: string) {
    const teams = await this.findTeams(tenantId);
    const team = teams.find((entry) => entry.id === teamId);

    if (!team) {
      throw new NotFoundException(`Care team ${teamId} not found in this tenant`);
    }

    return team;
  }

  async createTeam(tenantId: string, userId: string, dto: CreateCareTeamDto) {
    const teamName = dto.name.trim();
    const existing = await this.prisma.careTeam.findFirst({
      where: {
        tenantId,
        isActive: true,
        name: teamName,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Care team "${dto.name}" already exists in this tenant`);
    }

    const members = dto.members ?? [];
    await this.validateMembers(tenantId, members);

    const team = await this.prisma.careTeam.create({
      data: {
        tenantId,
        name: teamName,
        description: dto.description?.trim() || null,
        createdBy: userId,
        updatedBy: userId,
        members: {
          create: members.map((member) => ({
            userId: member.userId,
            roleId: member.roleId,
            facilityId: member.facilityId ?? null,
            addedBy: userId,
          })),
        },
      },
      select: { id: true },
    });

    return this.findTeam(tenantId, team.id);
  }

  async updateTeam(tenantId: string, userId: string, teamId: string, dto: UpdateCareTeamDto) {
    const existingTeam = await this.prisma.careTeam.findFirst({
      where: {
        id: teamId,
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    if (!existingTeam) {
      throw new NotFoundException(`Care team ${teamId} not found in this tenant`);
    }

    const nextName = dto.name?.trim() || existingTeam.name;
    const nextDescription = dto.description === undefined
      ? existingTeam.description
      : dto.description.trim() || null;
    const nextMembers = dto.members ?? [];

    const duplicateName = await this.prisma.careTeam.findFirst({
      where: {
        tenantId,
        isActive: true,
        name: nextName,
        NOT: { id: teamId },
      },
      select: { id: true },
    });

    if (duplicateName) {
      throw new ConflictException(`Care team "${nextName}" already exists in this tenant`);
    }

    await this.validateMembers(tenantId, nextMembers);

    await this.prisma.$transaction([
      this.prisma.careTeam.update({
        where: { id: teamId },
        data: {
          name: nextName,
          description: nextDescription,
          updatedBy: userId,
        },
      }),
      this.prisma.careTeamMember.deleteMany({
        where: { careTeamId: teamId },
      }),
      this.prisma.careTeamMember.createMany({
        data: nextMembers.map((member) => ({
          careTeamId: teamId,
          userId: member.userId,
          roleId: member.roleId,
          facilityId: member.facilityId ?? null,
          addedBy: userId,
        })),
      }),
    ]);

    return this.findTeam(tenantId, teamId);
  }
}
