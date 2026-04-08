import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { Tenant } from '../common/decorators/tenant.decorator';
import type { TenantContext } from '../common/decorators/tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(ThrottlerGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'List system roles and tenant custom roles with their permissions' })
  findAll(@Tenant() ctx: TenantContext) {
    return this.rolesService.findAll(ctx.tenantId);
  }

  @Get('permissions')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'List all available permissions that can be assigned to roles' })
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a custom role for this tenant' })
  create(@Tenant() ctx: TenantContext, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(ctx.tenantId, dto);
  }

  @Put(':roleId/permissions')
  @Roles('admin')
  @ApiOperation({ summary: 'Replace all permissions assigned to a custom role' })
  @ApiParam({ name: 'roleId', type: 'string', format: 'uuid' })
  assignPermissions(
    @Param('roleId') roleId: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.rolesService.assignPermissions(roleId, permissionIds);
  }
}
