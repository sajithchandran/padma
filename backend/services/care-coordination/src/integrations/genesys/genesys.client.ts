import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GenesysCallPayload {
  patientId: string;
  coordinatorId?: string;
  reason: string;
  priority: 'normal' | 'urgent';
  /** ISO 8601 timestamp for when the call should be placed */
  scheduledAt?: string;
}

export interface GenesysCallResult {
  callId: string;
  /** ISO 8601 timestamp confirming the scheduled time */
  scheduledAt: string;
}

@Injectable()
export class GenesysClient {
  private readonly logger = new Logger(GenesysClient.name);
  private readonly baseUrl: string;

  private readonly defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-source': 'padma',
  };

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('integration.genesys.baseUrl') ?? '';
  }

  /**
   * Schedule an outbound call for a patient via the Genesys contact centre.
   * POST /genesys/api/schedule-call
   */
  async scheduleCall(payload: GenesysCallPayload): Promise<GenesysCallResult> {
    const url = `${this.baseUrl}/genesys/api/schedule-call`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `GenesysClient.scheduleCall failed: ${response.status} ${response.statusText} — ${body}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    return response.json() as Promise<GenesysCallResult>;
  }
}
