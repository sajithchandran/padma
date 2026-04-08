import { Injectable, Logger } from '@nestjs/common';
import * as Mustache from 'mustache';
import { PrismaService } from '../database/prisma.service';
import { AthmaClient } from '../integrations/athma/athma.client';
import { SalesforceClient } from '../integrations/salesforce/salesforce.client';
import { TemplatesService } from './templates/templates.service';
import { SendMessageDto, MessageChannel } from './dto/send-message.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

interface MessageListFilters {
  patientId?: string;
  direction?: string;
  channel?: string;
  status?: string;
}

interface PreparedMessage {
  subject?: string;
  body: string;
  templateId?: string;
  providerName: string;
}

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly athmaClient: AthmaClient,
    private readonly salesforceClient: SalesforceClient,
    private readonly templatesService: TemplatesService,
  ) {}

  /**
   * Request-time pipeline:
   *  1. Validate preferences / consent
   *  2. Render template content
   *  3. Persist PatientMessage as ready_to_send
   * Background delivery happens separately in CommunicationDeliverySchedulerService.
   */
  async dispatch(tenantId: string, dto: SendMessageDto) {
    const { patientId, channel, templateCode, purpose } = dto;
    const variables = dto.variables ?? {};

    // ── 1. Preferences ──────────────────────────────────────────────────────
    const prefs = await this.prisma.patientPreference.findUnique({
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
    const consent = await this.prisma.patientConsent.findFirst({
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

    // ── 6. Template render / preparation ─────────────────────────────────────
    const prepared = await this.prepareMessage(tenantId, dto, prefs?.preferredLanguage ?? 'en');

    // ── 7. Persist PatientMessage (ready_to_send) ────────────────────────────
    const messageData: any = {
      tenantId,
      patientId,
      channel,
      direction: 'outbound',
      templateCode,
      subject: prepared.subject ?? null,
      body: prepared.body,
      purpose,
      relatedEntityType: dto.relatedEntityType ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
      status: 'ready_to_send',
      providerName: prepared.providerName,
      idempotencyKey: dto.idempotencyKey ?? null,
    };

    // Handle idempotency: if a key was provided and a record already exists, return it
    if (dto.idempotencyKey) {
      const existing = await this.prisma.patientMessage.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: dto.idempotencyKey } },
      });
      if (existing) {
        this.logger.log(
          `CommunicationService: idempotent duplicate for key=${dto.idempotencyKey}, returning existing message ${existing.id}`,
        );
        return existing;
      }
    }

    return this.prisma.patientMessage.create({
      data: messageData,
    });
  }

  /**
   * Fetch tenant-wide communication history ordered by most-recent first.
   */
  async listMessages(
    tenantId: string,
    filters: MessageListFilters,
    pagination: PaginationDto,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.direction) where.direction = filters.direction;
    if (filters.channel) where.channel = filters.channel;
    if (filters.status) where.status = filters.status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patientMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.patientMessage.count({ where }),
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

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patientMessage.findMany({
        where: { tenantId, patientId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.patientMessage.count({
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

  async processReadyMessages(limit = 25): Promise<number> {
    const readyMessages = await this.prisma.patientMessage.findMany({
      where: {
        status: 'ready_to_send',
        direction: 'outbound',
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    if (readyMessages.length === 0) {
      return 0;
    }

    let processedCount = 0;

    for (const message of readyMessages) {
      const claimed = await this.prisma.patientMessage.updateMany({
        where: {
          id: message.id,
          status: 'ready_to_send',
        },
        data: {
          status: 'processing',
        },
      });

      if (claimed.count === 0) {
        continue;
      }

      await this.deliverMessage(message.id);
      processedCount += 1;
    }

    return processedCount;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async prepareMessage(
    tenantId: string,
    dto: SendMessageDto,
    language: string,
  ): Promise<PreparedMessage> {
    const template = await this.templatesService.findByCode(
      tenantId,
      dto.templateCode,
      dto.channel,
      language,
    );

    let renderedBody: string;
    let subject: string | undefined;

    if (template) {
      renderedBody = Mustache.render(template.bodyTemplate, dto.variables ?? {});
      subject = template.subject
        ? Mustache.render(template.subject, dto.variables ?? {})
        : undefined;
    } else {
      renderedBody = String((dto.variables as Record<string, unknown> | undefined)?.body ?? '');
      this.logger.warn(
        `CommunicationService: no approved template found for code=${dto.templateCode} channel=${dto.channel} lang=${language}; using raw body fallback`,
      );
    }

    return {
      subject,
      body: renderedBody,
      templateId: template?.id,
      providerName: this.resolveProviderName(dto.channel),
    };
  }

  private async deliverMessage(messageId: string) {
    const message = await this.prisma.patientMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return;
    }

    try {
      let providerRef: string | undefined;

      if (
        message.channel === MessageChannel.WHATSAPP ||
        message.channel === MessageChannel.SMS ||
        message.channel === MessageChannel.EMAIL
      ) {
        await this.athmaClient.triggerReminder({
          tenantId: message.tenantId,
          patientId: message.patientId,
          triggerType: 'communication',
          channel: message.channel,
          scheduledAt: new Date().toISOString(),
          metadata: {
            rendered_body: message.body,
            template_ref: message.templateCode ?? null,
            subject: message.subject ?? null,
          },
        });
        providerRef = message.templateCode ?? undefined;
      } else if (message.channel === MessageChannel.IN_APP || message.channel === MessageChannel.PUSH) {
        this.logger.log(
          `CommunicationService: channel=${message.channel} dispatched internally for patient=${message.patientId}`,
        );
      } else {
        this.logger.log(
          `CommunicationService: Genesys call not implemented for patient=${message.patientId}`,
        );
      }

      const sentMessage = await this.prisma.patientMessage.update({
        where: { id: message.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          providerRef: providerRef ?? null,
          failureReason: null,
        },
      });

      this.salesforceClient
        .logCommunication({
          tenantId: message.tenantId,
          patientId: message.patientId,
          channel: message.channel,
          direction: 'outbound',
          bodySummary: message.body.slice(0, 200),
          status: 'sent',
          sentAt: sentMessage.sentAt!.toISOString(),
        })
        .catch((err: Error) =>
          this.logger.error(
            `CommunicationService: Salesforce log failed for message=${message.id}: ${err.message}`,
            err.stack,
          ),
        );
    } catch (err: any) {
      await this.prisma.patientMessage.update({
        where: { id: message.id },
        data: {
          status: 'failed',
          failureReason: err?.message ?? 'Unknown dispatch error',
        },
      });
    }
  }

  private async createSkipped(
    tenantId: string,
    dto: SendMessageDto,
    reason: string,
  ) {
    this.logger.log(
      `CommunicationService: skipping message for patient=${dto.patientId} channel=${dto.channel} reason=${reason}`,
    );

    return this.prisma.patientMessage.create({
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
