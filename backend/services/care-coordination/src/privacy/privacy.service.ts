import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaCoreService } from '../database/prisma-core.service';
import { PrismaEngagementService } from '../database/prisma-engagement.service';
import { DsarResponseDto } from './dto/dsar.dto';

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly prismaCore: PrismaCoreService,
    private readonly prismaEngagement: PrismaEngagementService,
  ) {}

  /**
   * GDPR Art. 15 — Data Subject Access Request.
   *
   * Aggregates all data held for a patient across both databases and returns
   * a structured JSON object. Message bodies are intentionally excluded.
   */
  async generateDsar(
    tenantId: string,
    patientId: string,
  ): Promise<DsarResponseDto> {
    const [enrollments, tasks, messages, consents] = await Promise.all([
      this.prismaCore.patientPathwayEnrollment.findMany({
        where: { tenantId, patientId },
        include: {
          stageHistory: {
            orderBy: { transitionedAt: 'asc' },
            select: {
              id: true,
              fromStageName: true,
              toStageName: true,
              transitionType: true,
              reason: true,
              transitionedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prismaCore.careTask.findMany({
        where: { tenantId, patientId },
        include: {
          interventionTemplate: {
            select: { interventionType: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prismaEngagement.patientMessage.findMany({
        where: { tenantId, patientId },
        select: {
          id: true,
          channel: true,
          purpose: true,
          status: true,
          createdAt: true,
          // body intentionally excluded
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaEngagement.patientConsent.findMany({
        where: { tenantId, patientId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      patient_id: patientId,
      generated_at: new Date().toISOString(),
      enrollments: enrollments.map((e) => ({
        id: e.id,
        pathwayId: e.pathwayId,
        status: e.status,
        stagesHistory: e.stageHistory.map((h) => ({
          id: h.id,
          fromStageName: h.fromStageName,
          toStageName: h.toStageName,
          transitionType: h.transitionType,
          reason: h.reason,
          transitionedAt: h.transitionedAt.toISOString(),
        })),
        adherencePercent: e.adherencePercent !== null ? Number(e.adherencePercent) : null,
        enrolledAt: e.enrollmentDate ? e.enrollmentDate.toISOString() : null,
        graduatedAt: e.status === 'graduated' && e.actualEndDate ? e.actualEndDate.toISOString() : null,
        dischargedAt: e.status === 'completed' && e.actualEndDate ? e.actualEndDate.toISOString() : null,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        interventionType: t.interventionTemplate?.interventionType ?? t.interventionType,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        status: t.status,
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      })),
      messages: messages.map((m) => ({
        id: m.id,
        channel: m.channel,
        purpose: m.purpose,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      })),
      consents: consents.map((c) => ({
        id: c.id,
        consentType: c.consentType,
        status: c.status,
        grantedAt: c.grantedAt.toISOString(),
        withdrawnAt: c.withdrawnAt ? c.withdrawnAt.toISOString() : null,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        collectionMethod: c.collectionMethod,
        consentVersion: c.consentVersion ?? null,
      })),
    };
  }

  /**
   * GDPR Art. 17 — Right to Erasure ("Right to be Forgotten").
   *
   * Per Art. 17(3)(c), healthcare audit records must be retained for
   * regulatory compliance. Therefore, enrollments and tasks are ANONYMISED
   * (PII fields nulled) rather than deleted. Communication history and
   * consent records are deleted in full.
   */
  async requestErasure(
    tenantId: string,
    patientId: string,
    performedBy: string,
  ): Promise<void> {
    const patientIdHash = createHash('sha256').update(patientId).digest('hex');

    this.logger.warn(
      `PrivacyService.requestErasure: initiating GDPR erasure — tenantId=${tenantId} patientIdHash=${patientIdHash} performedBy=${performedBy}`,
    );

    // Step 1: Anonymise PatientPathwayEnrollment PII — retain for audit
    await this.prismaCore.patientPathwayEnrollment.updateMany({
      where: { tenantId, patientId },
      data: {
        patientDisplayName: null,
        patientMrn: null,
        patientDob: null,
        patientGender: null,
      },
    });

    // Step 2: Anonymise CareTask PII — retain for audit
    await this.prismaCore.careTask.updateMany({
      where: { tenantId, patientId },
      data: {
        patientDisplayName: null,
        patientMrn: null,
      },
    });

    // Step 3: Delete PatientPreference
    await this.prismaEngagement.patientPreference.deleteMany({
      where: { tenantId, patientId },
    });

    // Step 4: Delete PatientConsent
    await this.prismaEngagement.patientConsent.deleteMany({
      where: { tenantId, patientId },
    });

    // Step 5: Delete PatientMessage
    await this.prismaEngagement.patientMessage.deleteMany({
      where: { tenantId, patientId },
    });

    this.logger.warn(
      `PrivacyService.requestErasure: completed — tenantId=${tenantId} patientIdHash=${patientIdHash}`,
    );
  }
}
