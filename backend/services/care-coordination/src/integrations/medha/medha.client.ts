import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MedhaAdherencePayload {
  tenantId: string;
  reportDate: string;
  enrollments: Array<{
    enrollmentId: string;
    patientId: string;
    pathwayCode: string;
    category: string;
    currentStage: string;
    adherencePercent: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
  }>;
}

@Injectable()
export class MedhaClient {
  private readonly logger = new Logger(MedhaClient.name);
  private readonly baseUrl: string;

  private readonly defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-source': 'padma',
  };

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('integration.medha.baseUrl') ?? '';
  }

  /**
   * Push daily adherence metrics for a batch of enrollments to Medha.
   * POST /medha/api/metrics
   */
  async pushAdherenceMetrics(payload: MedhaAdherencePayload): Promise<void> {
    const url = `${this.baseUrl}/medha/api/metrics`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `MedhaClient.pushAdherenceMetrics failed: ${response.status} ${response.statusText} — ${body}`;
      this.logger.error(msg);
      throw new Error(msg);
    }
  }
}
