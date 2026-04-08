import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ClinicalDataService } from '../../pathway-engine/clinical-data.service';
import { TasksService } from '../../tasks/tasks.service';
import { JobsService } from '../../jobs/jobs.service';
import { AthmaWebhookEvent, AthmaLabResultPayload } from './athma.types';

@Injectable()
export class AthmaWebhookHandlerService {
  private readonly logger = new Logger(AthmaWebhookHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicalDataService: ClinicalDataService,
    private readonly tasksService: TasksService,
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Entry point: process a persisted Athma webhook event.
   * Marks the WebhookEvent row as processed (or errored) when done.
   */
  async handle(webhookEventId: string, event: AthmaWebhookEvent): Promise<void> {
    // Optimistically mark processed so duplicate deliveries are idempotent
    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { processed: true, processedAt: new Date() },
    });

    try {
      await this.dispatch(event);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;

      this.logger.error(
        `Error handling Athma event ${event.event_type} (webhookEvent=${webhookEventId}): ${message}`,
        stack,
      );

      await this.prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { error: message },
      }).catch((updateErr: unknown) => {
        this.logger.error(
          `Failed to write error to webhookEvent ${webhookEventId}: ${updateErr}`,
        );
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Dispatcher
  // ---------------------------------------------------------------------------

  private async dispatch(event: AthmaWebhookEvent): Promise<void> {
    switch (event.event_type) {
      case 'appointment.completed':
        await this.handleAppointmentCompleted(event);
        break;
      case 'lab_result.available':
        await this.handleLabResultAvailable(event);
        break;
      case 'prescription.dispensed':
        await this.handlePrescriptionDispensed(event);
        break;
      case 'nursing_assessment.completed':
        await this.handleNursingAssessment(event);
        break;
      case 'vitals.recorded':
        await this.handleVitalsRecorded(event);
        break;
      case 'discharge.completed':
        await this.handleDischargeCompleted(event);
        break;
      case 'device_reading.received':
        await this.handleDeviceReading(event);
        break;
      case 'telehealth_session.completed':
        await this.handleTelehealth(event);
        break;
      case 'home_visit.completed':
        await this.handleHomeVisit(event);
        break;
      case 'patient_self_report.submitted':
        await this.handleSelfReport(event);
        break;
      default:
        this.logger.warn(
          `AthmaWebhookHandlerService: unhandled event_type '${event.event_type}' for patient ${event.patient_id}`,
        );
    }
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  private async handleAppointmentCompleted(event: AthmaWebhookEvent): Promise<void> {
    const taskIds = await this.findMatchingTaskIds(event);
    await this.tasksService.autoComplete(
      event.tenant_id,
      taskIds,
      'athma_opd',
      {
        event_type: event.event_type,
        entity_id: event.entity_id,
        occurred_at: event.occurred_at,
        payload: event.payload,
      },
    );
  }

  private async handleLabResultAvailable(event: AthmaWebhookEvent): Promise<void> {
    const taskIds = await this.findMatchingTaskIds(event);
    await this.tasksService.autoComplete(
      event.tenant_id,
      taskIds,
      'athma_lab',
      {
        event_type: event.event_type,
        entity_id: event.entity_id,
        occurred_at: event.occurred_at,
        payload: event.payload,
      },
    );

    // Update clinical data for every active enrollment of this patient
    const labPayload = event.payload as unknown as AthmaLabResultPayload;

    const enrollments = await this.prisma.patientPathwayEnrollment.findMany({
      where: {
        tenantId: event.tenant_id,
        patientId: event.patient_id,
        status: { in: ['active', 'paused'] },
      },
      select: { id: true },
    });

    await Promise.all(
      enrollments.map((enrollment) =>
        this.clinicalDataService
          .updateFromAthmaLabResult(event.tenant_id, enrollment.id, {
            testCode: labPayload.test_code,
            value: labPayload.value,
            unit: labPayload.unit,
            resultAt: labPayload.result_at,
          })
          .catch((err: Error) => {
            this.logger.error(
              `Failed to update clinical data for enrollment ${enrollment.id}: ${err.message}`,
              err.stack,
            );
          }),
      ),
    );

    // Enqueue EVALUATE_TRANSITIONS for each active enrollment so the pathway
    // engine can assess whether a stage transition is now warranted.
    const activeEnrollments = await this.prisma.patientPathwayEnrollment.findMany({
      where: {
        tenantId: event.tenant_id,
        patientId: event.patient_id,
        status: 'active',
      },
      select: { id: true },
    });

    await Promise.all(
      activeEnrollments.map((enrollment) =>
        this.jobsService
          .enqueue(
            event.tenant_id,
            'EVALUATE_TRANSITIONS',
            {
              enrollmentId: enrollment.id,
              triggeredBy: 'lab_result.available',
              entityId: event.entity_id,
              occurredAt: event.occurred_at,
            },
            {
              enrollmentId: enrollment.id,
              patientId: event.patient_id,
              idempotencyKey: `${event.tenant_id}:EVALUATE_TRANSITIONS:${enrollment.id}:${event.entity_id}`,
            },
          )
          .catch((err: Error) => {
            this.logger.error(
              `Failed to enqueue EVALUATE_TRANSITIONS for enrollment ${enrollment.id}: ${err.message}`,
              err.stack,
            );
          }),
      ),
    );
  }

  private async handlePrescriptionDispensed(event: AthmaWebhookEvent): Promise<void> {
    const taskIds = await this.findMatchingTaskIds(event);
    await this.tasksService.autoComplete(
      event.tenant_id,
      taskIds,
      'athma_pharmacy',
      {
        event_type: event.event_type,
        entity_id: event.entity_id,
        occurred_at: event.occurred_at,
        payload: event.payload,
      },
    );
  }

  private async handleNursingAssessment(event: AthmaWebhookEvent): Promise<void> {
    const taskIds = await this.findMatchingTaskIds(event);
    await this.tasksService.autoComplete(
      event.tenant_id,
      taskIds,
      'athma_inpatient',
      {
        event_type: event.event_type,
        entity_id: event.entity_id,
        occurred_at: event.occurred_at,
        payload: event.payload,
      },
    );
  }

  private async handleVitalsRecorded(event: AthmaWebhookEvent): Promise<void> {
    const taskIds = await this.findMatchingTaskIds(event);
    await this.tasksService.autoComplete(
      event.tenant_id,
      taskIds,
      'athma_inpatient',
      {
        event_type: event.event_type,
        entity_id: event.entity_id,
        occurred_at: event.occurred_at,
        payload: event.payload,
      },
    );
  }

  private async handleDischargeCompleted(event: AthmaWebhookEvent): Promise<void> {
    const taskIds = await this.findMatchingTaskIds(event);
    await this.tasksService.autoComplete(
      event.tenant_id,
      taskIds,
      'athma_inpatient',
      {
        event_type: event.event_type,
        entity_id: event.entity_id,
        occurred_at: event.occurred_at,
        payload: event.payload,
      },
    );
  }

  private async handleDeviceReading(event: AthmaWebhookEvent): Promise<void> {
    const taskIds = await this.findMatchingTaskIds(event);
    await this.tasksService.autoComplete(
      event.tenant_id,
      taskIds,
      'device_sync',
      {
        event_type: event.event_type,
        entity_id: event.entity_id,
        occurred_at: event.occurred_at,
        payload: event.payload,
      },
    );
  }

  private async handleTelehealth(event: AthmaWebhookEvent): Promise<void> {
    const taskIds = await this.findMatchingTaskIds(event);
    await this.tasksService.autoComplete(
      event.tenant_id,
      taskIds,
      'telehealth',
      {
        event_type: event.event_type,
        entity_id: event.entity_id,
        occurred_at: event.occurred_at,
        payload: event.payload,
      },
    );
  }

  private async handleHomeVisit(event: AthmaWebhookEvent): Promise<void> {
    const taskIds = await this.findMatchingTaskIds(event);
    await this.tasksService.autoComplete(
      event.tenant_id,
      taskIds,
      'home_visit',
      {
        event_type: event.event_type,
        entity_id: event.entity_id,
        occurred_at: event.occurred_at,
        payload: event.payload,
      },
    );
  }

  private async handleSelfReport(event: AthmaWebhookEvent): Promise<void> {
    const taskIds = await this.findMatchingTaskIds(event);
    await this.tasksService.autoComplete(
      event.tenant_id,
      taskIds,
      'patient_self_report',
      {
        event_type: event.event_type,
        entity_id: event.entity_id,
        occurred_at: event.occurred_at,
        payload: event.payload,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Find all active/pending/upcoming tasks for this patient whose
   * autoCompleteEventType matches the incoming event_type.
   */
  private async findMatchingTaskIds(event: AthmaWebhookEvent): Promise<string[]> {
    const tasks = await this.prisma.careTask.findMany({
      where: {
        tenantId: event.tenant_id,
        patientId: event.patient_id,
        status: { in: ['pending', 'upcoming', 'active'] },
        autoCompleteEventType: event.event_type,
      },
      select: { id: true },
    });

    return tasks.map((t) => t.id);
  }
}
