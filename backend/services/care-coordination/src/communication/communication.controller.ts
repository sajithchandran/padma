import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Tenant } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CommunicationService } from './communication.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Communication')
@Controller('')
@UseGuards(RolesGuard)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  /**
   * POST /communication/send
   * Dispatch an ad-hoc or templated message to a patient.
   */
  @Post('communication/send')
  @ApiOperation({ summary: 'Send a message to a patient via the specified channel' })
  send(
    @Tenant() tenant: TenantContext,
    @Body() dto: SendMessageDto,
  ) {
    return this.communicationService.dispatch(tenant.tenantId, dto);
  }

  /**
   * GET /patients/:patientId/messages
   * Retrieve paginated message history for a patient.
   */
  @Get('patients/:patientId/messages')
  @ApiOperation({ summary: 'Get message history for a patient (Patient 360)' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  getHistory(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.communicationService.getHistory(
      tenant.tenantId,
      patientId,
      pagination,
    );
  }
}
