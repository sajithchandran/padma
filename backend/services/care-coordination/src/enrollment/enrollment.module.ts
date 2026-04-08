import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { StageManagerService } from './stage-manager.service';
import { PathwayEngineModule } from '../pathway-engine/pathway-engine.module';

@Module({
  imports: [PathwayEngineModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, StageManagerService],
  exports: [EnrollmentService, StageManagerService],
})
export class EnrollmentModule {}
