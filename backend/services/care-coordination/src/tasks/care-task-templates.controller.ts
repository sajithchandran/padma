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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Tenant, Roles } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { CareTaskTemplatesService } from './care-task-templates.service';
import { CreateCareTaskTemplateDto } from './dto/create-care-task-template.dto';
import { UpdateCareTaskTemplateDto } from './dto/update-care-task-template.dto';

@ApiTags('Care Task Templates')
@Controller('care-task-templates')
@UseGuards(RolesGuard)
export class CareTaskTemplatesController {
  constructor(private readonly careTaskTemplatesService: CareTaskTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List tenant care task templates with optional filters' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'interventionType', required: false })
  @ApiQuery({ name: 'careSetting', required: false })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  list(
    @Tenant() tenant: TenantContext,
    @Query('q') q?: string,
    @Query('interventionType') interventionType?: string,
    @Query('careSetting') careSetting?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.careTaskTemplatesService.list(tenant.tenantId, {
      q,
      interventionType,
      careSetting,
      activeOnly: activeOnly === undefined ? true : activeOnly === 'true',
    });
  }

  @Post()
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Create a reusable care task template' })
  create(
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateCareTaskTemplateDto,
  ) {
    return this.careTaskTemplatesService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single care task template' })
  findOne(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.careTaskTemplatesService.findOne(tenant.tenantId, id);
  }

  @Put(':id')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Update a reusable care task template' })
  update(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCareTaskTemplateDto,
  ) {
    return this.careTaskTemplatesService.update(tenant.tenantId, id, tenant.userId, dto);
  }

  @Delete(':id')
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Delete a reusable care task template' })
  remove(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.careTaskTemplatesService.remove(tenant.tenantId, id);
  }
}
