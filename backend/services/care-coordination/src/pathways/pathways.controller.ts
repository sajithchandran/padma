import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { UpdateStageDto } from './dto/update-stage.dto';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { CreateTransitionRuleDto } from './dto/create-transition-rule.dto';
import { UpdateTransitionRuleDto } from './dto/update-transition-rule.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { ListPathwaysDto } from './dto/list-pathways.dto';

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

  // ─── Pathway CRUD ──────────────────────────────────────────────────────────

  @Post()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Create a clinical pathway (with optional nested stages)' })
  create(@Tenant() tenant: TenantContext, @Body() dto: CreatePathwayDto) {
    return this.pathwaysService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List clinical pathways (with stage summary + enrollment count)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'status', required: false, description: 'draft | active | deprecated' })
  @ApiQuery({ name: 'code', required: false, description: 'Filter by pathway code to list versions' })
  findAll(
    @Tenant() tenant: TenantContext,
    @Query() query: ListPathwaysDto,
  ) {
    const { category, status, code, ...pagination } = query;
    return this.pathwaysService.findAll(tenant.tenantId, { category, status, code }, pagination);
  }

  // NOTE: Static sub-resource routes MUST be declared before /:id to avoid NestJS
  // treating the literal segment (e.g. "stages") as the :id param.

  // ─── Stage sub-resource (path-level) ───────────────────────────────────────

  @Get('stages/:stageId')
  @ApiOperation({ summary: 'Get a single stage with interventions and transition rules' })
  findStage(
    @Tenant() tenant: TenantContext,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Query('pathwayId', ParseUUIDPipe) pathwayId: string,
  ) {
    return this.stagesService.findOne(tenant.tenantId, pathwayId, stageId);
  }

  @Put('stages/:stageId')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update a stage (without pathwayId in path — use query param)' })
  updateStageById(
    @Tenant() tenant: TenantContext,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Query('pathwayId', ParseUUIDPipe) pathwayId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.stagesService.update(tenant.tenantId, pathwayId, stageId, dto);
  }

  // ─── Intervention sub-resource ─────────────────────────────────────────────

  @Get('stages/:stageId/interventions')
  @ApiOperation({ summary: 'List all interventions for a stage' })
  listInterventions(
    @Tenant() tenant: TenantContext,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.interventionsService.listByStage(tenant.tenantId, stageId);
  }

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

  @Get('interventions/:id')
  @ApiOperation({ summary: 'Get a single intervention template' })
  findIntervention(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interventionsService.findOne(tenant.tenantId, id);
  }

  @Put('interventions/:id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update an intervention template' })
  updateIntervention(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterventionDto,
  ) {
    return this.interventionsService.update(tenant.tenantId, id, dto);
  }

  @Delete('interventions/:id')
  @Roles('admin', 'supervisor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an intervention template' })
  removeIntervention(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interventionsService.remove(tenant.tenantId, id);
  }

  // ─── Transition rule sub-resource ──────────────────────────────────────────

  @Get('transitions/:id')
  @ApiOperation({ summary: 'Get a single transition rule' })
  findTransition(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transitionsService.findOne(tenant.tenantId, id);
  }

  @Put('transitions/:id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update a transition rule' })
  updateTransition(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransitionRuleDto,
  ) {
    return this.transitionsService.update(tenant.tenantId, id, dto);
  }

  @Delete('transitions/:id')
  @Roles('admin', 'supervisor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a transition rule' })
  removeTransition(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transitionsService.remove(tenant.tenantId, id);
  }

  // ─── Pathway by ID (must come AFTER static sub-resource prefixes) ──────────

  @Get(':id')
  @ApiOperation({ summary: 'Get full pathway detail (stages → interventions + transition rules)' })
  findOne(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.pathwaysService.findOne(tenant.tenantId, id);
  }

  @Put(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update pathway metadata (only draft pathways)' })
  update(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePathwayDto,
  ) {
    return this.pathwaysService.update(tenant.tenantId, id, tenant.userId, dto);
  }

  @Delete(':id')
  @Roles('admin', 'supervisor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a pathway (sets isActive=false). Cannot delete active pathways.' })
  remove(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pathwaysService.softDelete(tenant.tenantId, id, tenant.userId);
  }

  @Post(':id/publish')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Publish a pathway (draft → active). Validates entry stage exists.' })
  publish(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.pathwaysService.publish(tenant.tenantId, id, tenant.userId);
  }

  @Post(':id/clone')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Clone a pathway as a new draft version (increments version number)' })
  clone(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.pathwaysService.clone(tenant.tenantId, id, tenant.userId);
  }

  // ─── Stage CRUD under pathway ───────────────────────────────────────────────

  @Get(':pathwayId/stages')
  @ApiOperation({ summary: 'List all stages for a pathway (ordered by sortOrder)' })
  listStages(
    @Tenant() tenant: TenantContext,
    @Param('pathwayId', ParseUUIDPipe) pathwayId: string,
  ) {
    return this.stagesService.listByPathway(tenant.tenantId, pathwayId);
  }

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

  @Patch(':pathwayId/stages/reorder')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Reorder stages within a pathway (drag-and-drop)' })
  reorderStages(
    @Tenant() tenant: TenantContext,
    @Param('pathwayId', ParseUUIDPipe) pathwayId: string,
    @Body() dto: ReorderStagesDto,
  ) {
    return this.stagesService.reorder(tenant.tenantId, pathwayId, dto.stages);
  }

  @Get(':pathwayId/stages/:stageId')
  @ApiOperation({ summary: 'Get a single stage within a pathway (with interventions)' })
  findOneStage(
    @Tenant() tenant: TenantContext,
    @Param('pathwayId', ParseUUIDPipe) pathwayId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.stagesService.findOne(tenant.tenantId, pathwayId, stageId);
  }

  @Put(':pathwayId/stages/:stageId')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update a stage within a pathway' })
  updateStage(
    @Tenant() tenant: TenantContext,
    @Param('pathwayId', ParseUUIDPipe) pathwayId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.stagesService.update(tenant.tenantId, pathwayId, stageId, dto);
  }

  @Delete(':pathwayId/stages/:stageId')
  @Roles('admin', 'supervisor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a stage (cascade deletes interventions)' })
  removeStage(
    @Tenant() tenant: TenantContext,
    @Param('pathwayId', ParseUUIDPipe) pathwayId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.stagesService.remove(tenant.tenantId, pathwayId, stageId);
  }

  // ─── Transition rules under pathway ────────────────────────────────────────

  @Get(':pathwayId/transitions')
  @ApiOperation({ summary: 'List all transition rules for a pathway' })
  listTransitions(
    @Tenant() tenant: TenantContext,
    @Param('pathwayId', ParseUUIDPipe) pathwayId: string,
  ) {
    return this.transitionsService.listByPathway(tenant.tenantId, pathwayId);
  }

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
}
