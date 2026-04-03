import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { TasksModule } from '../tasks/tasks.module';
import { PathwayEngineModule } from '../pathway-engine/pathway-engine.module';
import { JobsService } from './jobs.service';
import { JobsRunnerService } from './jobs-runner.service';

@Module({
  imports: [DatabaseModule, TasksModule, PathwayEngineModule],
  providers: [JobsService, JobsRunnerService],
  exports: [JobsService],
})
export class JobsModule {}
