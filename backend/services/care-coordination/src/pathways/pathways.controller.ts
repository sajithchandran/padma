import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Tenant, Roles } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { PathwaysService } from './pathways.service';
import { StagesService } from './stages.service';
import { InterventionsService } from './interventions.service';
import { TransitionsService } from './transitions.service';
import { CreatePathwayDto } from './dto/create-pathway.dto';
import { UpdatePathwayDto } from './dto/update-pathway.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { CreateTransitionRuleDto } from './dto/create-transition-rule.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Clinical Pathways')
@Controller('pathways')
@UseGuards(RolesGuard)
export class PathwaysController {
  constructor(
    private readonly pathwaysService: PathwaysService,
    private readonly stagesService: StagesService,
    private readonly interventionsService: InterventionsService,
    private readonly transitionsService: TransitionsService,
  ) {}

  @Post()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Create a clinical pathway' })
  create(@Tenant() tenant: TenantContext, @Body() dto: CreatePathwayDto) {
    return this.pathwaysService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List clinical pathways' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Tenant() tenant: TenantContext,
    @Query() pagination: PaginationDto,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.pathwaysService.findAll(tenant.tenantId, { category, status }, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pathway detail with stages, interventions, and transitions' })
  findOne(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.pathwaysService.findOne(tenant.tenantId, id);
  }

  @Put(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update a clinical pathway' })
  update(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePathwayDto,
  ) {
    return this.pathwaysService.update(tenant.tenantId, id, tenant.userId, dto);
  }

  @Post(':id/publish')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Publish a pathway (set status to active)' })
  publish(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.pathwaysService.publish(tenant.tenantId, id, tenant.userId);
  }

  @Post(':id/clone')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Clone a pathway with incremented version' })
  clone(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.pathwaysService.clone(tenant.tenantId, id, tenant.userId);
  }

  // --- Stages ---

  @Post(':pathwayId/stages')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Add a stage to a pathway' })
  createStage(
    @Tenant() tenant: TenantContext,
    @Param('pathwayId', ParseUUIDPipe) pathwayId: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.stagesService.create(tenant.tenantId, pathwayId, dto);
  }

  @Put(':pathwayId/stages/:stageId')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update a stage' })
  updateStage(
    @Tenant() tenant: TenantContext,
    @Param('pathwayId', ParseUUIDPipe) pathwayId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: Partial<CreateStageDto>,
  ) {
    return this.stagesService.update(tenant.tenantId, pathwayId, stageId, dto);
  }

  @Delete(':pathwayId/stages/:stageId')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Delete a stage' })
  removeStage(
    @Tenant() tenant: TenantContext,
    @Param('pathwayId', ParseUUIDPipe) pathwayId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.stagesService.remove(tenant.tenantId, pathwayId, stageId);
  }

  // --- Interventions ---

  @Post('stages/:stageId/interventions')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Add an intervention template to a stage' })
  createIntervention(
    @Tenant() tenant: TenantContext,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: CreateInterventionDto,
  ) {
    return this.interventionsService.create(tenant.tenantId, stageId, dto);
  }

  @Put('interventions/:id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update an intervention template' })
  updateIntervention(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateInterventionDto>,
  ) {
    return this.interventionsService.update(tenant.tenantId, id, dto);
  }

  @Delete('interventions/:id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Delete an intervention template' })
  removeIntervention(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interventionsService.remove(tenant.tenantId, id);
  }

  // --- Transitions ---

  @Post(':pathwayId/transitions')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Add a transition rule to a pathway' })
  createTransition(
    @Tenant() tenant: TenantContext,
    @Param('pathwayId', ParseUUIDPipe) pathwayId: string,
    @Body() dto: CreateTransitionRuleDto,
  ) {
    return this.transitionsService.create(tenant.tenantId, pathwayId, dto);
  }

  @Put('transitions/:id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update a transition rule' })
  updateTransition(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateTransitionRuleDto>,
  ) {
    return this.transitionsService.update(tenant.tenantId, id, dto);
  }

  @Delete('transitions/:id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Delete a transition rule' })
  removeTransition(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transitionsService.remove(tenant.tenantId, id);
  }
}
