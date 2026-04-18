import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Tenant, Roles } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { PatientsService } from './patients.service';

@ApiTags('Patients')
@Controller('patients')
@UseGuards(RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'List enrolled patients for the tenant' })
  @ApiQuery({ name: 'q', required: false, description: 'Search by patient name, MRN, or pathway name' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by aggregated patient status' })
  @ApiQuery({ name: 'filter', required: false, description: 'Use "mine" to show patients whose pathway care team includes the current user' })
  findAll(
    @Tenant() tenant: TenantContext,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('filter') filter?: string,
  ) {
    return this.patientsService.findAll(tenant.tenantId, { q, status, filter, userId: tenant.userId });
  }

  @Get('search')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Search patients by name or MRN from tenant enrollment snapshots' })
  @ApiQuery({ name: 'q', required: false, description: 'Search by patient name or MRN' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results to return' })
  search(
    @Tenant() tenant: TenantContext,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 20;
    return this.patientsService.search(tenant.tenantId, q, Number.isNaN(parsedLimit) ? 20 : parsedLimit);
  }
}
