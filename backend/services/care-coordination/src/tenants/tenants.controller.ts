import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from '../common/decorators/tenant.decorator';
import type { TenantContext } from '../common/decorators/tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(ThrottlerGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Get the current tenant profile and feature flags' })
  getMe(@Tenant() ctx: TenantContext) {
    return this.tenantsService.findOne(ctx.tenantId);
  }

  @Patch('me')
  @Roles('admin')
  @ApiOperation({ summary: 'Update tenant settings (contact info, timezone, locale)' })
  update(@Tenant() ctx: TenantContext, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(ctx.tenantId, dto);
  }

  @Get('me/feature-flags')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Get feature flags enabled for this tenant' })
  getFeatureFlags(@Tenant() ctx: TenantContext) {
    return this.tenantsService.getFeatureFlags(ctx.tenantId);
  }
}
