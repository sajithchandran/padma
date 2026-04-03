import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Tenant, Roles } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { ManualTransitionDto } from './dto/transition.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Enrollments')
@Controller('')
@UseGuards(RolesGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post('patients/:patientId/enroll')
  @Roles('admin', 'clinical_admin', 'coordinator')
  @ApiOperation({ summary: 'Enroll a patient into a clinical pathway' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  enroll(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateEnrollmentDto,
  ) {
    // Override patientId from path param to ensure consistency
    dto.patientId = patientId;
    return this.enrollmentService.enroll(tenant.tenantId, tenant.userId, dto);
  }

  @Get('patients/:patientId/enrollments')
  @ApiOperation({ summary: 'List enrollments for a specific patient' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'status', required: false })
  findPatientEnrollments(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.enrollmentService.findAll(
      tenant.tenantId,
      { patientId, status },
      pagination,
    );
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'List all enrollments (coordinator view)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'pathwayId', required: false })
  @ApiQuery({ name: 'coordinatorId', required: false })
  findAll(
    @Tenant() tenant: TenantContext,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('pathwayId') pathwayId?: string,
    @Query('coordinatorId') coordinatorId?: string,
  ) {
    return this.enrollmentService.findAll(
      tenant.tenantId,
      { status, patientId, pathwayId, coordinatorId },
      pagination,
    );
  }

  @Get('enrollments/:id')
  @ApiOperation({ summary: 'Get enrollment detail with stage history and task summary' })
  findOne(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.enrollmentService.findOne(tenant.tenantId, id);
  }

  @Put('enrollments/:id')
  @Roles('admin', 'clinical_admin', 'coordinator')
  @ApiOperation({ summary: 'Update enrollment fields' })
  update(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.enrollmentService.update(
      tenant.tenantId,
      id,
      tenant.userId,
      dto,
    );
  }

  @Post('enrollments/:id/pause')
  @Roles('admin', 'clinical_admin', 'coordinator')
  @ApiOperation({ summary: 'Pause an active enrollment' })
  pause(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.enrollmentService.pause(tenant.tenantId, id, tenant.userId);
  }

  @Post('enrollments/:id/resume')
  @Roles('admin', 'clinical_admin', 'coordinator')
  @ApiOperation({ summary: 'Resume a paused enrollment' })
  resume(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.enrollmentService.resume(tenant.tenantId, id, tenant.userId);
  }

  @Post('enrollments/:id/cancel')
  @Roles('admin', 'clinical_admin', 'coordinator')
  @ApiOperation({ summary: 'Cancel an enrollment' })
  cancel(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.enrollmentService.cancel(
      tenant.tenantId,
      id,
      tenant.userId,
      reason,
    );
  }

  @Post('enrollments/:id/transition')
  @Roles('admin', 'clinical_admin', 'coordinator')
  @ApiOperation({ summary: 'Manually transition enrollment to a different stage' })
  manualTransition(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualTransitionDto,
  ) {
    return this.enrollmentService.manualTransition(
      tenant.tenantId,
      id,
      tenant.userId,
      dto,
    );
  }
}
