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
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Tenant, Roles } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from '../dto/create-template.dto';

@ApiTags('Communication Templates')
@Controller('communication/templates')
@UseGuards(RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List communication templates with optional filters' })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Tenant() tenant: TenantContext,
    @Query('channel') channel?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.templatesService.findAll(tenant.tenantId, {
      channel,
      category,
      status,
    });
  }

  @Post()
  @Roles('admin', 'supervisor', 'care_coordinator')
  @ApiOperation({ summary: 'Create a new communication template (starts in draft status)' })
  create(
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templatesService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a communication template by id' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templatesService.findOne(tenant.tenantId, id);
  }

  @Post(':id/approve')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Approve a communication template (admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ schema: { type: 'object' } })
  approve(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templatesService.approve(tenant.tenantId, id, tenant.userId);
  }
}
