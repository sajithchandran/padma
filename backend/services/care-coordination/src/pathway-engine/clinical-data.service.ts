import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../node_modules/.prisma/client-core';
import { PrismaCoreService } from '../database';

export interface AthmaLabResultEvent {
  testCode: string;
  value: number;
  unit: string;
  resultAt: string;
}

const LAB_CODE_TO_CLINICAL_KEY: Record<string, string> = {
  HBA1C: 'latest_hba1c',
  FBS: 'latest_fasting_glucose',
  FPG: 'latest_fasting_glucose',
  BP_SYS: 'latest_bp_systolic',
  BP_DIA: 'latest_bp_diastolic',
  LDL: 'latest_ldl',
  BMI: 'latest_bmi',
  SPO2: 'latest_spo2',
  WEIGHT: 'latest_weight',
};

@Injectable()
export class ClinicalDataService {
  constructor(private readonly prisma: PrismaCoreService) {}

  async get(tenantId: string, enrollmentId: string): Promise<Record<string, unknown>> {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id: enrollmentId, tenantId },
      select: { clinicalData: true },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }

    if (!enrollment.clinicalData || typeof enrollment.clinicalData !== 'object') {
      return {};
    }

    return enrollment.clinicalData as Record<string, unknown>;
  }

  async update(
    tenantId: string,
    enrollmentId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    const existing = await this.get(tenantId, enrollmentId);

    const merged = { ...existing, ...updates };

    await this.prisma.patientPathwayEnrollment.updateMany({
      where: { id: enrollmentId, tenantId },
      data: { clinicalData: merged as Prisma.InputJsonValue },
    });
  }

  async updateFromAthmaLabResult(
    tenantId: string,
    enrollmentId: string,
    event: AthmaLabResultEvent,
  ): Promise<void> {
    const clinicalKey = LAB_CODE_TO_CLINICAL_KEY[event.testCode.toUpperCase()];

    const updates: Record<string, unknown> = {
      last_lab_result_at: event.resultAt,
    };

    if (clinicalKey) {
      updates[clinicalKey] = event.value;
    }

    await this.update(tenantId, enrollmentId, updates);
  }
}
