import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SalesforceCommLog {
  tenantId: string;
  patientId: string;
  channel: string;
  direction: 'outbound' | 'inbound';
  bodySummary: string;
  status: string;
  /** ISO 8601 timestamp */
  sentAt: string;
}

@Injectable()
export class SalesforceClient {
  private readonly logger = new Logger(SalesforceClient.name);
  private readonly baseUrl: string;

  private readonly defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-source': 'padma',
  };

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('integration.salesforce.baseUrl') ?? '';
  }

  /**
   * Log a communication event (SMS, email, call, etc.) to Salesforce CRM.
   * POST /salesforce/api/communication-logs
   */
  async logCommunication(payload: SalesforceCommLog): Promise<void> {
    const url = `${this.baseUrl}/salesforce/api/communication-logs`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `SalesforceClient.logCommunication failed: ${response.status} ${response.statusText} — ${body}`;
      this.logger.error(msg);
      throw new Error(msg);
    }
  }
}
