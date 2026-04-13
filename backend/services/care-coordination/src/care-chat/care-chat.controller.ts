import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles, Tenant } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CareChatService } from './care-chat.service';
import { CreateCareChatMessageDto } from './dto/create-care-chat-message.dto';

@ApiTags('Care Chat')
@Controller('')
@UseGuards(RolesGuard)
export class CareChatController {
  constructor(private readonly careChatService: CareChatService) {}

  @Get('enrollments/:enrollmentId/care-chat')
  @ApiOperation({ summary: 'List internal care-team chat messages for an enrollment' })
  @ApiParam({ name: 'enrollmentId', type: 'string', format: 'uuid' })
  listForEnrollment(
    @Tenant() tenant: TenantContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.careChatService.listForEnrollment(tenant.tenantId, enrollmentId, pagination);
  }

  @Post('enrollments/:enrollmentId/care-chat')
  @Roles('admin', 'supervisor', 'care_coordinator', 'physician', 'nurse')
  @ApiOperation({ summary: 'Post an internal care-team chat message for an enrollment' })
  @ApiParam({ name: 'enrollmentId', type: 'string', format: 'uuid' })
  createForEnrollment(
    @Tenant() tenant: TenantContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: CreateCareChatMessageDto,
  ) {
    return this.careChatService.postUserMessage(
      tenant.tenantId,
      enrollmentId,
      tenant.userId,
      dto.body,
      dto.metadata,
    );
  }

  @Get('patients/:patientId/care-chat')
  @ApiOperation({ summary: 'List internal care-team chat messages for a patient across enrollments' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  listForPatient(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.careChatService.listForPatient(tenant.tenantId, patientId, pagination);
  }
}
