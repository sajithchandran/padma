import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Tenant } from '../common/decorators/tenant.decorator';
import type { TenantContext } from '../common/decorators/tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CareTeamService } from './care-team.service';
import { CreateCareTeamDto } from './dto/create-care-team.dto';
import { UpdateCareTeamDto } from './dto/update-care-team.dto';

@ApiTags('Care Team')
@Controller('care-team')
@UseGuards(ThrottlerGuard, RolesGuard)
export class CareTeamController {
  constructor(private readonly careTeamService: CareTeamService) {}

  @Get('members')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'List tenant care-team master members derived from active users and roles' })
  @ApiQuery({ name: 'roleCode', required: false, description: 'Filter by care-team role code' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by display name, first name, last name, or email' })
  @ApiQuery({ name: 'includeInactive', required: false, description: 'Include users with non-ACTIVE user status' })
  findMembers(
    @Tenant() ctx: TenantContext,
    @Query('roleCode') roleCode?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.careTeamService.findMembers(ctx.tenantId, {
      roleCode,
      search,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('members/:userId')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Get a single care-team master member for this tenant' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  findMember(
    @Tenant() ctx: TenantContext,
    @Param('userId') userId: string,
  ) {
    return this.careTeamService.findMember(ctx.tenantId, userId);
  }

  @Get('roles')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'List roles eligible for care-team assignment' })
  findRoles(@Tenant() ctx: TenantContext) {
    return this.careTeamService.findRoles(ctx.tenantId);
  }

  @Get('teams')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'List named care teams for this tenant' })
  findTeams(@Tenant() ctx: TenantContext) {
    return this.careTeamService.findTeams(ctx.tenantId);
  }

  @Get('teams/:teamId')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Get a named care team with members' })
  @ApiParam({ name: 'teamId', type: 'string', format: 'uuid' })
  findTeam(
    @Tenant() ctx: TenantContext,
    @Param('teamId') teamId: string,
  ) {
    return this.careTeamService.findTeam(ctx.tenantId, teamId);
  }

  @Post('teams')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Create a named care team for this tenant' })
  createTeam(
    @Tenant() ctx: TenantContext,
    @Body() dto: CreateCareTeamDto,
  ) {
    return this.careTeamService.createTeam(ctx.tenantId, ctx.userId, dto);
  }

  @Put('teams/:teamId')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Update a named care team for this tenant' })
  @ApiParam({ name: 'teamId', type: 'string', format: 'uuid' })
  updateTeam(
    @Tenant() ctx: TenantContext,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateCareTeamDto,
  ) {
    return this.careTeamService.updateTeam(ctx.tenantId, ctx.userId, teamId, dto);
  }
}
