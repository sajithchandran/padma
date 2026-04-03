import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ZealPatient {
  id: string;
  displayName: string;
  mrn: string;
  dob: string;
  gender: string;
}

@Injectable()
export class ZealClient {
  private readonly logger = new Logger(ZealClient.name);
  private readonly baseUrl: string;

  private readonly defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-source': 'padma',
  };

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('integration.zeal.baseUrl') ?? '';
  }

  /**
   * Fetch a patient record from Zeal by their ID.
   * Returns null when Zeal responds with 404 (patient not found in Zeal).
   * GET /zeal/api/v1/patients/:id
   */
  async getPatient(
    tenantId: string,
    patientId: string,
  ): Promise<ZealPatient | null> {
    const url = `${this.baseUrl}/zeal/api/v1/patients/${encodeURIComponent(patientId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
        'x-tenant-id': tenantId,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `ZealClient.getPatient(${patientId}) failed: ${response.status} ${response.statusText} — ${body}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    return response.json() as Promise<ZealPatient>;
  }
}
