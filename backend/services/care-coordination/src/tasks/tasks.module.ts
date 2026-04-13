import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskGeneratorService } from './task-generator.service';
import { CareTaskTemplatesController } from './care-task-templates.controller';
import { CareTaskTemplatesService } from './care-task-templates.service';
import { CareChatModule } from '../care-chat/care-chat.module';

@Module({
  imports: [DatabaseModule, CareChatModule],
  controllers: [TasksController, CareTaskTemplatesController],
  providers: [TasksService, TaskGeneratorService, CareTaskTemplatesService],
  exports: [TasksService, TaskGeneratorService, CareTaskTemplatesService],
})
export class TasksModule {}
