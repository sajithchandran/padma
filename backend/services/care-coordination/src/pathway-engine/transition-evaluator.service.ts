import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaCoreService } from '../database';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ClinicalDataService } from './clinical-data.service';

export interface TransitionResult {
  ruleId: string;
  ruleName: string;
  toStageId: string;
  toStageName: string;
  type: 'automatic' | 'proposed';
}

@Injectable()
export class TransitionEvaluatorService {
  private readonly logger = new Logger(TransitionEvaluatorService.name);

  constructor(
    private readonly prisma: PrismaCoreService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly clinicalData: ClinicalDataService,
  ) {}

  async evaluateForEnrollment(
    tenantId: string,
    enrollmentId: string,
  ): Promise<TransitionResult[]> {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id: enrollmentId, tenantId, status: 'active' },
      include: {
        currentStage: { select: { id: true, code: true, name: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Active enrollment ${enrollmentId} not found`);
    }

    const rules = await this.prisma.stageTransitionRule.findMany({
      where: {
        tenantId,
        fromStageId: enrollment.currentStageId,
        isActive: true,
      },
      include: {
        toStage: { select: { id: true, name: true } },
      },
      orderBy: { priority: 'desc' },
    });

    if (rules.length === 0) {
      return [];
    }

    const clinicalDataRecord = await this.clinicalData.get(tenantId, enrollmentId);
    const context = this.buildEvaluationContext(enrollment, clinicalDataRecord);

    const results: TransitionResult[] = [];

    for (const rule of rules) {
      let matched = false;

      try {
        matched = this.conditionEvaluator.evaluate(rule.conditionExpr, context);
      } catch (err) {
        this.logger.error(
          `Error evaluating transition rule ${rule.id} for enrollment ${enrollmentId}: ${err.message}`,
          err.stack,
        );
        continue;
      }

      if (!matched) continue;

      if (rule.isAutomatic) {
        await this.executeTransition(
          tenantId,
          enrollmentId,
          rule.id,
          rule.toStageId,
          'system',
          `Automatic transition via rule: ${rule.ruleName}`,
        );

        results.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          toStageId: rule.toStageId,
          toStageName: rule.toStage.name,
          type: 'automatic',
        });
      } else {
        results.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          toStageId: rule.toStageId,
          toStageName: rule.toStage.name,
          type: 'proposed',
        });
      }

      break;
    }

    return results;
  }

  async executeTransition(
    tenantId: string,
    enrollmentId: string,
    ruleId: string | null,
    toStageId: string,
    performedBy: string,
    reason?: string,
  ): Promise<void> {
    const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
      where: { id: enrollmentId, tenantId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }

    const fromStage = await this.prisma.pathwayStage.findUnique({
      where: { id: enrollment.currentStageId },
    });

    const toStage = await this.prisma.pathwayStage.findFirst({
      where: { id: toStageId, tenantId },
    });

    if (!toStage) {
      throw new NotFoundException(`Target stage ${toStageId} not found`);
    }

    const transitionType = ruleId ? 'automatic' : 'manual';
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.patientStageHistory.create({
        data: {
          tenantId,
          enrollmentId,
          fromStageId: fromStage?.id ?? null,
          fromStageName: fromStage?.name ?? null,
          toStageId: toStage.id,
          toStageName: toStage.name,
          transitionRuleId: ruleId ?? null,
          transitionType,
          reason: reason ?? null,
          clinicalDataSnapshot: await this.clinicalData
            .get(tenantId, enrollmentId)
            .catch(() => null) as any,
          performedBy,
          transitionedAt: now,
        },
      });

      await tx.patientPathwayEnrollment.update({
        where: { id: enrollmentId },
        data: {
          currentStageId: toStage.id,
          previousStageId: enrollment.currentStageId,
          currentStageEnteredAt: now,
          currentCareSetting:
            toStage.careSetting !== 'any'
              ? toStage.careSetting
              : enrollment.currentCareSetting,
        },
      });
    });
  }

  private buildEvaluationContext(
    enrollment: {
      currentStageEnteredAt: Date;
      currentStage: { code: string };
      adherencePercent: unknown;
      totalTasks: number;
      completedTasks: number;
      overdueTasks: number;
      patientGender: string | null;
      patientDob: Date | null;
    },
    clinicalDataRecord: Record<string, unknown>,
  ): Record<string, unknown> {
    const now = new Date();
    const daysElapsed = Math.floor(
      (now.getTime() - enrollment.currentStageEnteredAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    let ageYears: number | null = null;
    if (enrollment.patientDob) {
      const dob = enrollment.patientDob;
      ageYears = Math.floor(
        (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
      );
    }

    const adherencePercent =
      enrollment.adherencePercent !== null && enrollment.adherencePercent !== undefined
        ? Number(enrollment.adherencePercent)
        : null;

    return {
      stage: {
        daysElapsed,
        stageCode: enrollment.currentStage.code,
      },
      enrollment: {
        adherencePercent,
        totalTasks: enrollment.totalTasks,
        completedTasks: enrollment.completedTasks,
        overdueTasks: enrollment.overdueTasks,
      },
      lab_result: {
        HBA1C: { value: clinicalDataRecord['latest_hba1c'] ?? null },
        FBS: { value: clinicalDataRecord['latest_fasting_glucose'] ?? null },
        FPG: { value: clinicalDataRecord['latest_fasting_glucose'] ?? null },
        BP_SYS: { value: clinicalDataRecord['latest_bp_systolic'] ?? null },
        BP_DIA: { value: clinicalDataRecord['latest_bp_diastolic'] ?? null },
        LDL: { value: clinicalDataRecord['latest_ldl'] ?? null },
        BMI: { value: clinicalDataRecord['latest_bmi'] ?? null },
        SPO2: { value: clinicalDataRecord['latest_spo2'] ?? null },
        WEIGHT: { value: clinicalDataRecord['latest_weight'] ?? null },
      },
      patient: {
        gender: enrollment.patientGender,
        ageYears,
      },
    };
  }
}
