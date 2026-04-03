import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PathwayEngineModule } from '../pathway-engine/pathway-engine.module';
import { TasksModule } from '../tasks/tasks.module';
import { JobsModule } from '../jobs/jobs.module';

import { AthmaClient } from './athma/athma.client';
import { AthmaWebhookController } from './athma/athma-webhook.controller';
import { AthmaWebhookHandlerService } from './athma/athma-webhook-handler.service';
import { MedhaClient } from './medha/medha.client';
import { GenesysClient } from './genesys/genesys.client';
import { SalesforceClient } from './salesforce/salesforce.client';
import { ZealClient } from './zeal/zeal.client';

@Module({
  imports: [
    DatabaseModule,
    PathwayEngineModule,
    TasksModule,
    JobsModule,
  ],
  controllers: [AthmaWebhookController],
  providers: [
    AthmaClient,
    AthmaWebhookHandlerService,
    MedhaClient,
    GenesysClient,
    SalesforceClient,
    ZealClient,
  ],
  exports: [
    AthmaClient,
    AthmaWebhookHandlerService,
    MedhaClient,
    GenesysClient,
    SalesforceClient,
    ZealClient,
  ],
})
export class IntegrationsModule {}
