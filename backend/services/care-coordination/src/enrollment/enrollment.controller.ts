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
  HttpCode,
  HttpStatus,
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

  // ─── Enrollment creation ───────────────────────────────────────────────────

  /** Simple flat POST — patientId may be provided or auto-generated */
  @Post('enrollments')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Create an enrollment (patientId auto-generated if omitted)' })
  enrollFlat(@Tenant() tenant: TenantContext, @Body() dto: CreateEnrollmentDto) {
    return this.enrollmentService.enroll(tenant.tenantId, tenant.userId, dto);
  }

  /** REST-nested: patientId from URL param (overrides body) */
  @Post('patients/:patientId/enroll')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Enroll a patient into a clinical pathway (patientId from path)' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  enroll(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateEnrollmentDto,
  ) {
    dto.patientId = patientId;
    return this.enrollmentService.enroll(tenant.tenantId, tenant.userId, dto);
  }

  // ─── Enrollment queries ────────────────────────────────────────────────────

  @Get('patients/:patientId/enrollments')
  @ApiOperation({ summary: 'List all enrollments for a specific patient' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'status', required: false })
  findPatientEnrollments(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.enrollmentService.findAll(tenant.tenantId, { patientId, status }, pagination);
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'List all enrollments (coordinator view)' })
  @ApiQuery({ name: 'status', required: false, description: 'active | paused | completed | cancelled' })
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

  // NOTE: Static sub-paths (:id/stage-history, :id/proposed-transitions, :id/pause …)
  // must be registered BEFORE the plain :id GET so NestJS resolves them correctly.

  @Get('enrollments/:id/stage-history')
  @ApiOperation({ summary: 'Get the full stage transition history for an enrollment' })
  getStageHistory(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.enrollmentService.getStageHistory(tenant.tenantId, id);
  }

  @Get('enrollments/:id/proposed-transitions')
  @ApiOperation({
    summary:
      'Evaluate transition rules for the current stage and return proposed / auto-executed transitions',
  })
  getProposedTransitions(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.enrollmentService.getProposedTransitions(tenant.tenantId, id);
  }

  @Get('enrollments/:id')
  @ApiOperation({ summary: 'Get enrollment detail (pathway, current stage, task summary, stage history)' })
  findOne(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentService.findOne(tenant.tenantId, id);
  }

  // ─── Enrollment actions ────────────────────────────────────────────────────

  @Put('enrollments/:id')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Update enrollment fields (care team, coordinator, notes, care setting)' })
  update(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.enrollmentService.update(tenant.tenantId, id, tenant.userId, dto);
  }

  @Post('enrollments/:id/pause')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an active enrollment' })
  pause(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentService.pause(tenant.tenantId, id, tenant.userId);
  }

  @Post('enrollments/:id/resume')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused enrollment' })
  resume(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentService.resume(tenant.tenantId, id, tenant.userId);
  }

  @Post('enrollments/:id/cancel')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an enrollment with a reason' })
  cancel(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.enrollmentService.cancel(tenant.tenantId, id, tenant.userId, reason);
  }

  @Post('enrollments/:id/complete')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an enrollment as completed' })
  complete(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    return this.enrollmentService.complete(tenant.tenantId, id, tenant.userId, reason);
  }

  @Post('enrollments/:id/transition')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually transition enrollment to a different stage' })
  manualTransition(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualTransitionDto,
  ) {
    return this.enrollmentService.manualTransition(tenant.tenantId, id, tenant.userId, dto);
  }
}
