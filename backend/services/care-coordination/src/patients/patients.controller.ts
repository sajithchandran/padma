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
