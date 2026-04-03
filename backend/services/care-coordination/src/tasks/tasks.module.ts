import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskGeneratorService } from './task-generator.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TasksController],
  providers: [TasksService, TaskGeneratorService],
  exports: [TasksService, TaskGeneratorService],
})
export class TasksModule {}
