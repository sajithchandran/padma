import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Tenant, Roles } from '../common/decorators';
import type { TenantContext } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrivacyService } from './privacy.service';
import { ConsentService } from './consent.service';

@ApiTags('Privacy & Consent')
@Controller('privacy')
@UseGuards(RolesGuard)
export class PrivacyController {
  constructor(
    private readonly privacyService: PrivacyService,
    private readonly consentService: ConsentService,
  ) {}

  // ── DSAR ────────────────────────────────────────────────────────────────

  @Get('dsar/:patientId')
  @Roles('admin', 'clinical_admin')
  @ApiOperation({ summary: 'Generate a GDPR Data Subject Access Request export (admin only)' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  generateDsar(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.privacyService.generateDsar(tenant.tenantId, patientId);
  }

  // ── Erasure ──────────────────────────────────────────────────────────────

  @Post('erasure/:patientId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'GDPR Right to be Forgotten: anonymise PII and delete communication data (admin only)',
  })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  async requestErasure(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    await this.privacyService.requestErasure(
      tenant.tenantId,
      patientId,
      tenant.userId,
    );
  }

  // ── Consents ─────────────────────────────────────────────────────────────

  @Get('consents/:patientId')
  @ApiOperation({ summary: 'Get all consent records for a patient' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  getAllConsents(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.consentService.getAll(tenant.tenantId, patientId);
  }

  @Post('consents/:patientId')
  @ApiOperation({ summary: 'Grant a consent for a patient' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['consentType', 'method'],
      properties: {
        consentType: { type: 'string', example: 'communication_whatsapp' },
        method: { type: 'string', example: 'app', enum: ['app', 'paper', 'verbal_recorded'] },
        version: { type: 'string', example: '1.0' },
      },
    },
  })
  grantConsent(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() body: { consentType: string; method: string; version?: string },
    @Req() req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } },
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string | undefined)
      ?? req.socket?.remoteAddress
      ?? undefined;
    const userAgent = req.headers['user-agent'] as string | undefined;

    return this.consentService.grant(
      tenant.tenantId,
      patientId,
      body.consentType,
      body.method,
      body.version,
      ipAddress,
      userAgent,
    );
  }

  @Delete('consents/:patientId/:consentType')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Withdraw a specific consent type for a patient' })
  @ApiParam({ name: 'patientId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'consentType', type: 'string' })
  async withdrawConsent(
    @Tenant() tenant: TenantContext,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('consentType') consentType: string,
  ) {
    await this.consentService.withdraw(tenant.tenantId, patientId, consentType);
  }
}
