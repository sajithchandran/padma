import { Injectable, Logger } from '@nestjs/common';

interface StageAction {
  type: string;
  config?: Record<string, any>;
}

interface StageWithActions {
  id: string;
  name: string;
  entryActions?: any;
  exitActions?: any;
}

@Injectable()
export class StageManagerService {
  private readonly logger = new Logger(StageManagerService.name);

  /**
   * Execute actions defined on a stage's entryActions JSON when a patient
   * transitions into that stage.
   */
  async executeEntryActions(
    tenantId: string,
    enrollmentId: string,
    stage: StageWithActions,
  ): Promise<void> {
    const actions = this.parseActions(stage.entryActions);
    if (actions.length === 0) return;

    this.logger.log(
      `Executing ${actions.length} entry action(s) for stage "${stage.name}" on enrollment ${enrollmentId}`,
    );

    for (const action of actions) {
      try {
        await this.executeAction(tenantId, enrollmentId, stage.id, action, 'entry');
      } catch (error) {
        this.logger.error(
          `Entry action "${action.type}" failed for enrollment ${enrollmentId}, stage ${stage.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Execute actions defined on a stage's exitActions JSON when a patient
   * transitions out of that stage.
   */
  async executeExitActions(
    tenantId: string,
    enrollmentId: string,
    stage: StageWithActions,
  ): Promise<void> {
    const actions = this.parseActions(stage.exitActions);
    if (actions.length === 0) return;

    this.logger.log(
      `Executing ${actions.length} exit action(s) for stage "${stage.name}" on enrollment ${enrollmentId}`,
    );

    for (const action of actions) {
      try {
        await this.executeAction(tenantId, enrollmentId, stage.id, action, 'exit');
      } catch (error) {
        this.logger.error(
          `Exit action "${action.type}" failed for enrollment ${enrollmentId}, stage ${stage.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async executeAction(
    tenantId: string,
    enrollmentId: string,
    stageId: string,
    action: StageAction,
    phase: 'entry' | 'exit',
  ): Promise<void> {
    switch (action.type) {
      case 'generate_tasks':
        // Placeholder: TaskGenerator will pick this up via the job queue.
        this.logger.log(
          `[${phase}] generate_tasks: Queuing task generation for enrollment ${enrollmentId}, stage ${stageId}`,
        );
        break;

      case 'notify_coordinator':
        // Placeholder: will integrate with notification service.
        this.logger.log(
          `[${phase}] notify_coordinator: Sending notification for enrollment ${enrollmentId}`,
        );
        break;

      case 'send_welcome_message':
        // Placeholder: will integrate with messaging service.
        this.logger.log(
          `[${phase}] send_welcome_message: Sending welcome message for enrollment ${enrollmentId}`,
        );
        break;

      case 'cancel_pending_tasks':
        // Placeholder: will bulk-cancel pending tasks for this stage.
        this.logger.log(
          `[${phase}] cancel_pending_tasks: Cancelling pending tasks for enrollment ${enrollmentId}, stage ${stageId}`,
        );
        break;

      case 'recalculate_adherence':
        // Placeholder: will trigger adherence recalculation.
        this.logger.log(
          `[${phase}] recalculate_adherence: Recalculating adherence for enrollment ${enrollmentId}`,
        );
        break;

      default:
        this.logger.warn(
          `[${phase}] Unknown action type "${action.type}" for enrollment ${enrollmentId}, stage ${stageId}`,
        );
    }
  }

  private parseActions(raw: any): StageAction[] {
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw.map((item) => {
        if (typeof item === 'string') {
          return { type: item };
        }
        return item as StageAction;
      });
    }

    return [];
  }
}
