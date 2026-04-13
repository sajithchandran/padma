import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { StageManagerService } from './stage-manager.service';
import { PathwayEngineModule } from '../pathway-engine/pathway-engine.module';
import { TasksModule } from '../tasks/tasks.module';
import { CareChatModule } from '../care-chat/care-chat.module';

@Module({
  imports: [PathwayEngineModule, TasksModule, CareChatModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, StageManagerService],
  exports: [EnrollmentService, StageManagerService],
})
export class EnrollmentModule {}
