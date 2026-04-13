import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Tenant, Roles } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { ObservationsService } from './observations.service';
import { CreateObservationItemDto } from './dto/create-observation-item.dto';
import { UpdateObservationItemDto } from './dto/update-observation-item.dto';
import {
  CreatePatientObservationByCodeDto,
  CreatePatientObservationDto,
} from './dto/create-patient-observation.dto';
import { UpdatePatientObservationDto } from './dto/update-patient-observation.dto';
import {
  ObservationItemQueryDto,
  PatientObservationQueryDto,
} from './dto/observation-query.dto';

@ApiTags('Observations')
@Controller('')
@UseGuards(RolesGuard)
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  @Get('observation-items')
  @ApiOperation({ summary: 'List tenant observation item master records' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'dataType', required: false })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  listItems(
    @Tenant() tenant: TenantContext,
    @Query() query: ObservationItemQueryDto,
  ) {
    return this.observationsService.listItems(tenant.tenantId, query);
  }

  @Post('observation-items')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Create an observation item master record' })
  createItem(
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateObservationItemDto,
  ) {
    return this.observationsService.createItem(tenant.tenantId, dto);
  }

  @Get('observation-items/:id')
  @ApiOperation({ summary: 'Get an observation item master record' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getItem(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.observationsService.getItem(tenant.tenantId, id);
  }

  @Put('observation-items/:id')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Update an observation item master record' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateItem(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateObservationItemDto,
  ) {
    return this.observationsService.updateItem(tenant.tenantId, id, dto);
  }

  @Delete('observation-items/:id')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Deactivate an observation item master record' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  deactivateItem(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.observationsService.deactivateItem(tenant.tenantId, id);
  }

  @Get('patients/:patientId/observations')
  @ApiOperation({ summary: 'List structured observations for a patient' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'itemCode', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'observedFrom', required: false })
  @ApiQuery({ name: 'observedTo', required: false })
  listForPatient(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: PatientObservationQueryDto,
  ) {
    return this.observationsService.listForPatient(tenant.tenantId, patientId, query);
  }

  @Get('patients/:patientId/observations/latest')
  @ApiOperation({ summary: 'Latest observation per item for a patient' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'category', required: false })
  listLatestForPatient(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('category') category?: string,
  ) {
    return this.observationsService.listLatestForPatient(tenant.tenantId, patientId, category);
  }

  @Post('patients/:patientId/observations')
  @Roles('admin', 'supervisor', 'care_coordinator', 'physician', 'nurse')
  @ApiOperation({ summary: 'Record a structured observation for a patient' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  createForPatient(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientObservationDto,
  ) {
    return this.observationsService.createForPatient(
      tenant.tenantId,
      patientId,
      tenant.userId,
      dto,
    );
  }

  @Post('patients/:patientId/observations/by-code')
  @Roles('admin', 'supervisor', 'care_coordinator', 'physician', 'nurse')
  @ApiOperation({ summary: 'Record a structured observation using item code' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  createForPatientByCode(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientObservationByCodeDto,
  ) {
    return this.observationsService.createForPatientByCode(
      tenant.tenantId,
      patientId,
      tenant.userId,
      dto,
    );
  }

  @Get('observations/:id')
  @ApiOperation({ summary: 'Get a structured patient observation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getObservation(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.observationsService.getObservation(tenant.tenantId, id);
  }

  @Put('observations/:id')
  @Roles('admin', 'supervisor', 'care_coordinator', 'physician', 'nurse')
  @ApiOperation({ summary: 'Update a structured patient observation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateObservation(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientObservationDto,
  ) {
    return this.observationsService.updateObservation(
      tenant.tenantId,
      id,
      tenant.userId,
      dto,
    );
  }
}
