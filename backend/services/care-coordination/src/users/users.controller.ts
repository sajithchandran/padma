import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Tenant } from '../common/decorators/tenant.decorator';
import type { TenantContext } from '../common/decorators/tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(ThrottlerGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'List all users in the current tenant' })
  findAll(@Tenant() ctx: TenantContext) {
    return this.usersService.findAll(ctx.tenantId);
  }

  @Get(':userId')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Get a specific user with their role and permissions' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  findOne(@Tenant() ctx: TenantContext, @Param('userId') userId: string) {
    return this.usersService.findOne(ctx.tenantId, userId);
  }

  @Post()
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Create a user and assign tenant access' })
  create(
    @Tenant() ctx: TenantContext,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Post(':userId/roles')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Assign or update a user\'s role within this tenant' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  assignRole(
    @Tenant() ctx: TenantContext,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(ctx.tenantId, userId, dto, ctx.userId);
  }

  @Delete(':userId/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Revoke a user\'s access to this tenant' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  revokeRole(@Tenant() ctx: TenantContext, @Param('userId') userId: string) {
    return this.usersService.revokeRole(ctx.tenantId, userId);
  }
}
