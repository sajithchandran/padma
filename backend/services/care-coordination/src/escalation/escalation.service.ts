import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConditionEvaluatorService } from '../pathway-engine/condition-evaluator.service';
import { JobsService } from '../jobs/jobs.service';
import { GenesysClient } from '../integrations/genesys/genesys.client';
import { CreateEscalationRuleDto, EscalationChainStepDto } from './dto/create-escalation-rule.dto';
import { UpdateEscalationRuleDto } from './dto/update-escalation-rule.dto';

interface TaskContext {
  id: string;
  tenantId: string;
  patientId: string;
  enrollmentId: string;
  dueDate: Date;
  priority: number;
  isCritical: boolean;
  escalationLevel: number;
  status: string;
  enrollment?: {
    adherencePercent: number | null;
  } | null;
}

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly jobsService: JobsService,
    private readonly genesysClient: GenesysClient,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateEscalationRuleDto,
  ) {
    return this.prisma.escalationRule.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        conditionExpr: dto.conditionExpr as any,
        escalationChain: dto.escalationChain as any,
        priority: dto.priority,
        isActive: dto.isActive,
        createdBy: userId,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters: { triggerType?: string; isActive?: boolean },
  ) {
    const where: any = { tenantId };
    if (filters.triggerType !== undefined) {
      where.triggerType = filters.triggerType;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.escalationRule.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const rule = await this.prisma.escalationRule.findFirst({
      where: { id, tenantId },
    });

    if (!rule) {
      throw new NotFoundException(`Escalation rule ${id} not found`);
    }

    return rule;
  }

  async update(
    tenantId: string,
    id: string,
    userId: string,
    dto: UpdateEscalationRuleDto,
  ) {
    await this.findOne(tenantId, id);

    return this.prisma.escalationRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.triggerType !== undefined && { triggerType: dto.triggerType }),
        ...(dto.conditionExpr !== undefined && { conditionExpr: dto.conditionExpr as any }),
        ...(dto.escalationChain !== undefined && { escalationChain: dto.escalationChain as any }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.escalationRule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Check all active escalation rules against the given task. For any rule
   * whose condition matches, execute the chain step corresponding to the
   * task's current escalation level.
   */
  async evaluateForTask(tenantId: string, task: TaskContext): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDay = new Date(task.dueDate);
    dueDay.setHours(0, 0, 0, 0);

    const msPerDay = 24 * 60 * 60 * 1000;
    const overdueDays = Math.max(
      0,
      Math.floor((today.getTime() - dueDay.getTime()) / msPerDay),
    );

    // Fetch enrollment for adherence context if not already populated
    let adherencePercent: number | null = null;
    if (task.enrollment !== undefined) {
      adherencePercent =
        task.enrollment?.adherencePercent !== undefined &&
        task.enrollment?.adherencePercent !== null
          ? Number(task.enrollment.adherencePercent)
          : null;
    } else {
      const enrollment = await this.prisma.patientPathwayEnrollment.findFirst({
        where: { id: task.enrollmentId, tenantId },
        select: { adherencePercent: true },
      });
      adherencePercent =
        enrollment?.adherencePercent !== null && enrollment?.adherencePercent !== undefined
          ? Number(enrollment.adherencePercent)
          : null;
    }

    const evalContext: Record<string, unknown> = {
      task: {
        overdueDays,
        priority: task.priority,
        isCritical: task.isCritical,
        escalationLevel: task.escalationLevel,
        status: task.status,
      },
      enrollment: {
        adherencePercent,
      },
      patient: {},
    };

    const rules = await this.prisma.escalationRule.findMany({
      where: { tenantId, isActive: true },
      orderBy: { priority: 'asc' },
    });

    for (const rule of rules) {
      try {
        const matches = this.conditionEvaluator.evaluate(
          rule.conditionExpr,
          evalContext,
        );

        if (!matches) {
          continue;
        }

        const chain = rule.escalationChain as unknown as EscalationChainStepDto[];
        if (!Array.isArray(chain) || chain.length === 0) {
          continue;
        }

        // Determine the chain step to execute based on current escalation level.
        // If we've exhausted the chain, use the last step (highest level).
        const stepIndex = Math.min(task.escalationLevel, chain.length - 1);
        const step = chain[stepIndex];

        await this.executeChainStep(tenantId, task, step);

        // Advance the escalation level on the task
        await this.prisma.careTask.update({
          where: { id: task.id },
          data: {
            escalationLevel: { increment: 1 },
            lastEscalatedAt: new Date(),
          },
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to evaluate/execute escalation rule ${rule.id} for task ${task.id}: ${err?.message}`,
          err?.stack,
        );
      }
    }
  }

  private async executeChainStep(
    tenantId: string,
    task: TaskContext,
    step: EscalationChainStepDto,
  ): Promise<void> {
    const runAt = step.delayHours > 0
      ? new Date(Date.now() + step.delayHours * 60 * 60 * 1000)
      : new Date();

    switch (step.action) {
      case 'send_reminder': {
        await this.jobsService.enqueue(
          tenantId,
          'SEND_REMINDER',
          {
            taskId: task.id,
            patientId: task.patientId,
            enrollmentId: task.enrollmentId,
            reminderType: 'overdue',
            channel: step.channel,
          },
          {
            taskId: task.id,
            patientId: task.patientId,
            enrollmentId: task.enrollmentId,
            runAt,
            idempotencyKey: `${tenantId}:ESCALATE_REMINDER:${task.id}:${step.level}:${runAt.toISOString().slice(0, 10)}`,
          },
        );
        break;
      }

      case 'notify_coordinator': {
        await this.jobsService.enqueue(
          tenantId,
          'NOTIFY_COORDINATOR',
          {
            taskId: task.id,
            patientId: task.patientId,
            enrollmentId: task.enrollmentId,
            channel: step.channel,
            priority: 'normal',
          },
          {
            taskId: task.id,
            patientId: task.patientId,
            enrollmentId: task.enrollmentId,
            runAt,
            idempotencyKey: `${tenantId}:NOTIFY_COORD:${task.id}:${step.level}:${runAt.toISOString().slice(0, 10)}`,
          },
        );
        break;
      }

      case 'schedule_call': {
        await this.genesysClient.scheduleCall({
          patientId: task.patientId,
          reason: `Escalation: overdue task ${task.id}`,
          priority: 'normal',
          scheduledAt: runAt.toISOString(),
        });
        break;
      }

      case 'alert_supervisor': {
        await this.jobsService.enqueue(
          tenantId,
          'NOTIFY_COORDINATOR',
          {
            taskId: task.id,
            patientId: task.patientId,
            enrollmentId: task.enrollmentId,
            channel: step.channel,
            priority: 'urgent',
            targetRole: 'supervisor',
          },
          {
            taskId: task.id,
            patientId: task.patientId,
            enrollmentId: task.enrollmentId,
            runAt,
            idempotencyKey: `${tenantId}:ALERT_SUPER:${task.id}:${step.level}:${runAt.toISOString().slice(0, 10)}`,
          },
        );
        break;
      }

      default:
        this.logger.warn(`Unknown escalation action: ${(step as any).action}`);
    }
  }
}
