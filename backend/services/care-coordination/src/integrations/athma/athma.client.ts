import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AthmaProduct,
  AthmaPatient,
  AthmaTriggerPayload,
  AthmaOpdStatus,
} from './athma.types';

@Injectable()
export class AthmaClient {
  private readonly logger = new Logger(AthmaClient.name);
  private readonly baseUrl: string;

  private readonly defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-source': 'padma',
  };

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('integration.athma.baseUrl') ?? '';
  }

  /**
   * Fetch all product/care-plan templates available for a given tenant.
   * GET /athma/api/products
   */
  async syncProductTemplates(tenantId: string): Promise<AthmaProduct[]> {
    const url = `${this.baseUrl}/athma/api/products`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
        'x-tenant-id': tenantId,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `AthmaClient.syncProductTemplates failed: ${response.status} ${response.statusText} — ${body}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    return response.json() as Promise<AthmaProduct[]>;
  }

  /**
   * Fetch a single patient record from Athma.
   * GET /athma/api/patients/:id
   */
  async getPatient(
    tenantId: string,
    athmaPatientId: string,
  ): Promise<AthmaPatient> {
    const url = `${this.baseUrl}/athma/api/patients/${encodeURIComponent(athmaPatientId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
        'x-tenant-id': tenantId,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `AthmaClient.getPatient(${athmaPatientId}) failed: ${response.status} ${response.statusText} — ${body}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    return response.json() as Promise<AthmaPatient>;
  }

  /**
   * Send a care-plan reminder trigger to Athma.
   * POST /athma/api/triggers/reminder
   */
  async triggerReminder(payload: AthmaTriggerPayload): Promise<void> {
    const url = `${this.baseUrl}/athma/api/triggers/reminder`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `AthmaClient.triggerReminder failed: ${response.status} ${response.statusText} — ${body}`;
      this.logger.error(msg);
      throw new Error(msg);
    }
  }

  /**
   * Get the current OPD journey status for a patient.
   * GET /athma/api/opd-journey/:patientId
   */
  async getOpdJourneyStatus(
    tenantId: string,
    patientId: string,
  ): Promise<AthmaOpdStatus> {
    const url = `${this.baseUrl}/athma/api/opd-journey/${encodeURIComponent(patientId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
        'x-tenant-id': tenantId,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `AthmaClient.getOpdJourneyStatus(${patientId}) failed: ${response.status} ${response.statusText} — ${body}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    return response.json() as Promise<AthmaOpdStatus>;
  }
}
