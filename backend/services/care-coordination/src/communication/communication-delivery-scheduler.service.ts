import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CommunicationService } from './communication.service';

@Injectable()
export class CommunicationDeliverySchedulerService {
  private readonly logger = new Logger(CommunicationDeliverySchedulerService.name);
  private isRunning = false;

  constructor(private readonly communicationService: CommunicationService) {}

  @Cron('*/30 * * * * *')
  async processQueuedMessages() {
    if (this.isRunning) {
      this.logger.debug('Communication delivery scheduler already running, skipping tick');
      return;
    }

    this.isRunning = true;

    try {
      const processed = await this.communicationService.processReadyMessages(25);
      if (processed > 0) {
        this.logger.log(`Processed ${processed} queued communication message(s)`);
      }
    } catch (err: any) {
      this.logger.error(
        `Communication delivery scheduler failed: ${err?.message}`,
        err?.stack,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
