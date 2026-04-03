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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Tenant, Roles } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { EscalationService } from './escalation.service';
import { CreateEscalationRuleDto } from './dto/create-escalation-rule.dto';
import { UpdateEscalationRuleDto } from './dto/update-escalation-rule.dto';

@ApiTags('Escalation Rules')
@Controller('escalation-rules')
@UseGuards(RolesGuard)
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Get()
  @ApiOperation({ summary: 'List escalation rules (filter by triggerType and/or isActive)' })
  @ApiQuery({ name: 'triggerType', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Tenant() tenant: TenantContext,
    @Query('triggerType') triggerType?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveParsed =
      isActive !== undefined ? isActive === 'true' : undefined;

    return this.escalationService.findAll(tenant.tenantId, {
      triggerType,
      isActive: isActiveParsed,
    });
  }

  @Post()
  @Roles('admin', 'clinical_admin')
  @ApiOperation({ summary: 'Create a new escalation rule (admin only)' })
  create(
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateEscalationRuleDto,
  ) {
    return this.escalationService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single escalation rule by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.escalationService.findOne(tenant.tenantId, id);
  }

  @Put(':id')
  @Roles('admin', 'clinical_admin')
  @ApiOperation({ summary: 'Update an escalation rule (admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEscalationRuleDto,
  ) {
    return this.escalationService.update(
      tenant.tenantId,
      id,
      tenant.userId,
      dto,
    );
  }

  @Delete(':id')
  @Roles('admin', 'clinical_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an escalation rule by setting isActive=false (admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  delete(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.escalationService.delete(tenant.tenantId, id);
  }
}
