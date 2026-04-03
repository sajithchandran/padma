import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { PathwayEngineModule } from '../pathway-engine/pathway-engine.module';
import { JobsModule } from '../jobs/jobs.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EscalationService } from './escalation.service';
import { EscalationScannerService } from './escalation-scanner.service';
import { EscalationController } from './escalation.controller';

@Module({
  imports: [DatabaseModule, PathwayEngineModule, JobsModule, IntegrationsModule],
  controllers: [EscalationController],
  providers: [EscalationService, EscalationScannerService],
  exports: [EscalationService],
})
export class EscalationModule {}
