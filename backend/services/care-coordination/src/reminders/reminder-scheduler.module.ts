import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { JobsModule } from '../jobs/jobs.module';
import { ReminderSchedulerService } from './reminder-scheduler.service';

@Module({
  imports: [DatabaseModule, JobsModule],
  providers: [ReminderSchedulerService],
})
export class ReminderSchedulerModule {}
