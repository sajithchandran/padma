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
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Tenant, Roles } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { TasksService } from './tasks.service';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@ApiTags('Tasks')
@Controller('')
@UseGuards(RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // -----------------------------------------------------------------------
  // GET /tasks — coordinator task queue
  // -----------------------------------------------------------------------
  @Get('tasks')
  @ApiOperation({ summary: 'Coordinator task queue with filters' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'enrollmentId', required: false })
  @ApiQuery({ name: 'stageId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedToUserId', required: false })
  @ApiQuery({ name: 'dueDateFrom', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'dueDateTo', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'careSetting', required: false })
  findAll(
    @Tenant() tenant: TenantContext,
    @Query() pagination: PaginationDto,
    @Query('patientId') patientId?: string,
    @Query('enrollmentId') enrollmentId?: string,
    @Query('stageId') stageId?: string,
    @Query('status') status?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('dueDateFrom') dueDateFrom?: string,
    @Query('dueDateTo') dueDateTo?: string,
    @Query('careSetting') careSetting?: string,
  ) {
    return this.tasksService.findAll(
      tenant.tenantId,
      {
        patientId,
        enrollmentId,
        stageId,
        status,
        assignedToUserId,
        dueDateFrom: dueDateFrom ? new Date(dueDateFrom) : undefined,
        dueDateTo: dueDateTo ? new Date(dueDateTo) : undefined,
        careSetting,
      },
      pagination,
    );
  }

  // -----------------------------------------------------------------------
  // GET /patients/:patientId/tasks — Patient 360 view
  // -----------------------------------------------------------------------
  @Get('patients/:patientId/tasks')
  @ApiOperation({ summary: 'All tasks for a patient across all enrollments (Patient 360)' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  findForPatient360(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.tasksService.findForPatient360(
      tenant.tenantId,
      patientId,
      pagination,
    );
  }

  // -----------------------------------------------------------------------
  // GET /enrollments/:enrollmentId/tasks — tasks for an enrollment
  // -----------------------------------------------------------------------
  @Get('enrollments/:enrollmentId/tasks')
  @ApiOperation({ summary: 'Tasks for a specific enrollment' })
  @ApiParam({ name: 'enrollmentId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'stageId', required: false })
  findForEnrollment(
    @Tenant() tenant: TenantContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('stageId') stageId?: string,
  ) {
    return this.tasksService.findAll(
      tenant.tenantId,
      { enrollmentId, status, stageId },
      pagination,
    );
  }

  // -----------------------------------------------------------------------
  // GET /tasks/:id — task detail with events
  // -----------------------------------------------------------------------
  @Get('tasks/:id')
  @ApiOperation({ summary: 'Task detail with audit events' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.findOne(tenant.tenantId, id);
  }

  // -----------------------------------------------------------------------
  // PUT /tasks/:id/status — update status
  // -----------------------------------------------------------------------
  @Put('tasks/:id/status')
  @Roles('admin', 'clinical_admin', 'coordinator', 'nurse')
  @ApiOperation({ summary: 'Update task status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateStatus(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    // Route to the correct service method based on status
    switch (dto.status) {
      case 'completed':
        return this.tasksService.complete(tenant.tenantId, id, tenant.userId, dto);
      case 'skipped':
        return this.tasksService.skip(
          tenant.tenantId,
          id,
          tenant.userId,
          dto.completionNotes ?? 'Skipped by coordinator',
        );
      case 'cancelled':
        return this.tasksService.cancel(
          tenant.tenantId,
          id,
          tenant.userId,
          dto.completionNotes ?? 'Cancelled by coordinator',
        );
      default:
        // For pending / upcoming / active status changes
        return this.tasksService.complete(tenant.tenantId, id, tenant.userId, dto);
    }
  }

  // -----------------------------------------------------------------------
  // POST /tasks/:id/complete — complete with notes/evidence
  // -----------------------------------------------------------------------
  @Post('tasks/:id/complete')
  @Roles('admin', 'clinical_admin', 'coordinator', 'nurse')
  @ApiOperation({ summary: 'Complete a task with notes and evidence' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        completionNotes: { type: 'string' },
        completionMethod: { type: 'string' },
        completionEvidence: { type: 'object' },
      },
    },
  })
  complete(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      completionNotes?: string;
      completionMethod?: string;
      completionEvidence?: Record<string, unknown>;
    },
  ) {
    return this.tasksService.complete(tenant.tenantId, id, tenant.userId, body);
  }

  // -----------------------------------------------------------------------
  // POST /tasks/:id/skip — skip with reason
  // -----------------------------------------------------------------------
  @Post('tasks/:id/skip')
  @Roles('admin', 'clinical_admin', 'coordinator', 'nurse')
  @ApiOperation({ summary: 'Skip a task with a reason' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: { reason: { type: 'string' } },
    },
  })
  skip(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.tasksService.skip(tenant.tenantId, id, tenant.userId, reason);
  }

  // -----------------------------------------------------------------------
  // POST /tasks/:id/escalate — manual escalation
  // -----------------------------------------------------------------------
  @Post('tasks/:id/escalate')
  @Roles('admin', 'clinical_admin', 'coordinator')
  @ApiOperation({ summary: 'Manually escalate a task' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  escalate(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.escalate(tenant.tenantId, id, tenant.userId);
  }

  // -----------------------------------------------------------------------
  // POST /tasks/:id/reassign — reassign
  // -----------------------------------------------------------------------
  @Post('tasks/:id/reassign')
  @Roles('admin', 'clinical_admin', 'coordinator')
  @ApiOperation({ summary: 'Reassign a task to a different user or role' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assignedToUserId: { type: 'string', format: 'uuid', nullable: true },
        assignedToRole: { type: 'string', nullable: true },
      },
    },
  })
  reassign(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      assignedToUserId?: string | null;
      assignedToRole?: string | null;
    },
  ) {
    return this.tasksService.reassign(
      tenant.tenantId,
      id,
      tenant.userId,
      body.assignedToUserId ?? null,
      body.assignedToRole ?? null,
    );
  }
}
