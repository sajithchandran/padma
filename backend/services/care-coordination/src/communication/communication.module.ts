import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TemplatesService } from './templates/templates.service';
import { TemplatesController } from './templates/templates.controller';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import { AthmaTriggerAdapter } from './channels/athma-trigger.adapter';

@Module({
  imports: [DatabaseModule, IntegrationsModule],
  controllers: [TemplatesController, CommunicationController],
  providers: [TemplatesService, CommunicationService, AthmaTriggerAdapter],
  exports: [TemplatesService, CommunicationService],
})
export class CommunicationModule {}
