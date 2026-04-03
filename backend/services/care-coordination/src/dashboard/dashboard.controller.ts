import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Tenant } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: "Coordinator dashboard summary — task counts, adherence, pending transitions" })
  getSummary(@Tenant() tenant: TenantContext) {
    return this.dashboardService.getSummary(tenant.tenantId, tenant.userId);
  }

  @Get('overdue-tasks')
  @ApiOperation({ summary: 'Paginated list of overdue tasks across all patients' })
  getOverdueTasks(
    @Tenant() tenant: TenantContext,
    @Query() pagination: PaginationDto,
  ) {
    return this.dashboardService.getOverdueTasks(
      tenant.tenantId,
      tenant.userId,
      pagination,
    );
  }

  @Get('upcoming-tasks')
  @ApiOperation({ summary: "Tasks due within the next N days (default 7)" })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Look-ahead window in days (default 7)' })
  getUpcomingTasks(
    @Tenant() tenant: TenantContext,
    @Query('days') days?: string,
  ) {
    const parsedDays = days !== undefined ? parseInt(days, 10) : 7;
    return this.dashboardService.getUpcomingTasks(
      tenant.tenantId,
      tenant.userId,
      Number.isNaN(parsedDays) ? 7 : parsedDays,
    );
  }

  @Get('adherence-overview')
  @ApiOperation({ summary: 'Average adherence percentage grouped by care category' })
  getAdherenceOverview(@Tenant() tenant: TenantContext) {
    return this.dashboardService.getAdherenceOverview(tenant.tenantId);
  }

  @Get('my-patients')
  @ApiOperation({ summary: "Coordinator's assigned patients with adherence and overdue task counts" })
  getMyPatients(
    @Tenant() tenant: TenantContext,
    @Query() pagination: PaginationDto,
  ) {
    return this.dashboardService.getMyPatients(
      tenant.tenantId,
      tenant.userId,
      pagination,
    );
  }

  @Get('pathway-distribution')
  @ApiOperation({ summary: 'Active enrollment counts grouped by pathway and stage' })
  getPathwayDistribution(@Tenant() tenant: TenantContext) {
    return this.dashboardService.getPathwayDistribution(tenant.tenantId);
  }
}
