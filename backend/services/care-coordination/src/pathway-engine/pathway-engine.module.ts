import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ClinicalDataService } from './clinical-data.service';
import { TransitionEvaluatorService } from './transition-evaluator.service';

@Module({
  imports: [DatabaseModule],
  providers: [ConditionEvaluatorService, ClinicalDataService, TransitionEvaluatorService],
  exports: [ConditionEvaluatorService, ClinicalDataService, TransitionEvaluatorService],
})
export class PathwayEngineModule {}
