import { Injectable, Logger } from '@nestjs/common';
import * as Mustache from 'mustache';
import { PrismaEngagementService } from '../database/prisma-engagement.service';
import { AthmaClient } from '../integrations/athma/athma.client';
import { SalesforceClient } from '../integrations/salesforce/salesforce.client';
import { TemplatesService } from './templates/templates.service';
import { SendMessageDto, MessageChannel } from './dto/send-message.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly prismaEngagement: PrismaEngagementService,
    private readonly athmaClient: AthmaClient,
    private readonly salesforceClient: SalesforceClient,
    private readonly templatesService: TemplatesService,
  ) {}

  /**
   * Core dispatch pipeline:
   *  1. Load preferences → opt-out / DND / quiet hours checks
   *  2. Consent gate
   *  3. Template render
   *  4. Persist PatientMessage (pending)
   *  5. Channel dispatch
   *  6. Update record to sent / failed
   *  7. Fire-and-forget Salesforce log
   */
  async dispatch(tenantId: string, dto: SendMessageDto) {
    const { patientId, channel, templateCode, purpose } = dto;
    const variables = dto.variables ?? {};

    // ── 1. Preferences ──────────────────────────────────────────────────────
    const prefs = await this.prismaEngagement.patientPreference.findUnique({
      where: { tenantId_patientId: { tenantId, patientId } },
    });

    // ── 2. Opt-out check ────────────────────────────────────────────────────
    if (prefs) {
      if (channel === MessageChannel.SMS && prefs.optOutSms) {
        return this.createSkipped(tenantId, dto, 'opt_out_sms');
      }
      if (channel === MessageChannel.WHATSAPP && prefs.optOutWhatsapp) {
        return this.createSkipped(tenantId, dto, 'opt_out_whatsapp');
      }
      if (channel === MessageChannel.EMAIL && prefs.optOutEmail) {
        return this.createSkipped(tenantId, dto, 'opt_out_email');
      }

      // ── 3. Do Not Disturb ────────────────────────────────────────────────
      if (prefs.doNotDisturb) {
        return this.createSkipped(tenantId, dto, 'do_not_disturb');
      }

      // ── 4. Quiet hours ───────────────────────────────────────────────────
      if (prefs.quietHoursStart && prefs.quietHoursEnd) {
        const nowUtcHour = new Date().getUTCHours();
        const startHour = parseInt(prefs.quietHoursStart.split(':')[0], 10);
        const endHour = parseInt(prefs.quietHoursEnd.split(':')[0], 10);

        const inQuietHours =
          startHour <= endHour
            ? nowUtcHour >= startHour && nowUtcHour < endHour
            : nowUtcHour >= startHour || nowUtcHour < endHour; // wraps midnight

        if (inQuietHours) {
          return this.createSkipped(tenantId, dto, 'quiet_hours');
        }
      }
    }

    // ── 5. Consent check ────────────────────────────────────────────────────
    const consentType = `communication_${channel}`;
    const now = new Date();
    const consent = await this.prismaEngagement.patientConsent.findFirst({
      where: {
        tenantId,
        patientId,
        consentType,
        status: 'granted',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (!consent) {
      return this.createSkipped(tenantId, dto, `no_consent_${consentType}`);
    }

    // ── 6. Template render ───────────────────────────────────────────────────
    const language = prefs?.preferredLanguage ?? 'en';
    const template = await this.templatesService.findByCode(
      tenantId,
      templateCode,
      channel,
      language,
    );

    let renderedBody: string;
    let subject: string | undefined;

    if (template) {
      renderedBody = Mustache.render(template.bodyTemplate, variables);
      subject = template.subject
        ? Mustache.render(template.subject, variables)
        : undefined;
    } else {
      // Fallback: use variables.body as raw body
      renderedBody = String((variables as Record<string, unknown>).body ?? '');
      this.logger.warn(
        `CommunicationService: no approved template found for code=${templateCode} channel=${channel} lang=${language}; using raw body fallback`,
      );
    }

    // ── 7. Persist PatientMessage (pending) ───────────────────────────────
    const messageData: any = {
      tenantId,
      patientId,
      channel,
      direction: 'outbound',
      templateCode,
      subject: subject ?? null,
      body: renderedBody,
      purpose,
      relatedEntityType: dto.relatedEntityType ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
      status: 'pending',
      idempotencyKey: dto.idempotencyKey ?? null,
    };

    // Handle idempotency: if a key was provided and a record already exists, return it
    if (dto.idempotencyKey) {
      const existing = await this.prismaEngagement.patientMessage.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: dto.idempotencyKey } },
      });
      if (existing) {
        this.logger.log(
          `CommunicationService: idempotent duplicate for key=${dto.idempotencyKey}, returning existing message ${existing.id}`,
        );
        return existing;
      }
    }

    let message = await this.prismaEngagement.patientMessage.create({
      data: messageData,
    });

    // ── 8-10. Dispatch, update, and log ──────────────────────────────────
    try {
      // ── 8. Channel adapter dispatch ─────────────────────────────────────
      let providerRef: string | undefined;

      if (
        channel === MessageChannel.WHATSAPP ||
        channel === MessageChannel.SMS ||
        channel === MessageChannel.EMAIL
      ) {
        await this.athmaClient.triggerReminder({
          tenantId,
          patientId,
          triggerType: 'communication',
          channel,
          scheduledAt: new Date().toISOString(),
          metadata: {
            rendered_body: renderedBody,
            template_ref: template?.id ?? null,
          },
        });
        providerRef = template?.id ?? undefined;
      } else if (channel === MessageChannel.IN_APP || channel === MessageChannel.PUSH) {
        // In-app and push are handled by the platform directly; no external call needed
        this.logger.log(
          `CommunicationService: channel=${channel} dispatched internally for patient=${patientId}`,
        );
      } else {
        // Genesys call — not yet implemented
        this.logger.log(
          `CommunicationService: Genesys call not implemented for patient=${patientId}`,
        );
      }

      // ── 9. Update PatientMessage to sent ────────────────────────────────
      message = await this.prismaEngagement.patientMessage.update({
        where: { id: message.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          providerName: this.resolveProviderName(channel),
          providerRef: providerRef ?? null,
        },
      });

      // ── 10. Fire-and-forget Salesforce log ──────────────────────────────
      this.salesforceClient
        .logCommunication({
          tenantId,
          patientId,
          channel,
          direction: 'outbound',
          bodySummary: renderedBody.slice(0, 200),
          status: 'sent',
          sentAt: message.sentAt!.toISOString(),
        })
        .catch((err: Error) =>
          this.logger.error(
            `CommunicationService: Salesforce log failed for message=${message.id}: ${err.message}`,
            err.stack,
          ),
        );
    } catch (err: any) {
      // Update message to failed and re-throw
      message = await this.prismaEngagement.patientMessage.update({
        where: { id: message.id },
        data: {
          status: 'failed',
          failureReason: err?.message ?? 'Unknown dispatch error',
        },
      });
      throw err;
    }

    return message;
  }

  /**
   * Fetch message history for a patient ordered by most-recent first.
   */
  async getHistory(
    tenantId: string,
    patientId: string,
    pagination: PaginationDto,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prismaEngagement.$transaction([
      this.prismaEngagement.patientMessage.findMany({
        where: { tenantId, patientId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaEngagement.patientMessage.count({
        where: { tenantId, patientId },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async createSkipped(
    tenantId: string,
    dto: SendMessageDto,
    reason: string,
  ) {
    this.logger.log(
      `CommunicationService: skipping message for patient=${dto.patientId} channel=${dto.channel} reason=${reason}`,
    );

    return this.prismaEngagement.patientMessage.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        channel: dto.channel,
        direction: 'outbound',
        templateCode: dto.templateCode,
        body: '',
        purpose: dto.purpose,
        relatedEntityType: dto.relatedEntityType ?? null,
        relatedEntityId: dto.relatedEntityId ?? null,
        status: 'skipped',
        failureReason: reason,
        idempotencyKey: dto.idempotencyKey ?? null,
      },
    });
  }

  private resolveProviderName(channel: MessageChannel): string {
    switch (channel) {
      case MessageChannel.WHATSAPP:
      case MessageChannel.SMS:
      case MessageChannel.EMAIL:
        return 'athma';
      case MessageChannel.IN_APP:
      case MessageChannel.PUSH:
        return 'platform';
      default:
        return 'unknown';
    }
  }
}
