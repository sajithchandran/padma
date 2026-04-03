import { Injectable, Logger } from '@nestjs/common';
import { AthmaClient } from '../../integrations/athma/athma.client';
import { AthmaTriggerPayload } from '../../integrations/athma/athma.types';

export interface DispatchPayload {
  tenantId: string;
  patientId: string;
  channel: string;
  renderedBody: string;
  templateRef?: string | null;
}

/**
 * Thin adapter that wraps AthmaClient.triggerReminder, formatting the
 * generic dispatch payload into the Athma-specific trigger shape.
 */
@Injectable()
export class AthmaTriggerAdapter {
  private readonly logger = new Logger(AthmaTriggerAdapter.name);

  constructor(private readonly athmaClient: AthmaClient) {}

  async send(payload: DispatchPayload): Promise<void> {
    const triggerPayload: AthmaTriggerPayload = {
      tenantId: payload.tenantId,
      patientId: payload.patientId,
      triggerType: 'communication',
      channel: payload.channel,
      scheduledAt: new Date().toISOString(),
      metadata: {
        rendered_body: payload.renderedBody,
        template_ref: payload.templateRef ?? null,
      },
    };

    this.logger.debug(
      `AthmaTriggerAdapter.send: patient=${payload.patientId} channel=${payload.channel} template=${payload.templateRef ?? 'none'}`,
    );

    await this.athmaClient.triggerReminder(triggerPayload);
  }
}
