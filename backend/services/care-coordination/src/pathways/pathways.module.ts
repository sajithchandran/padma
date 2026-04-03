import { Module } from '@nestjs/common';
import { PathwaysController } from './pathways.controller';
import { PathwaysService } from './pathways.service';
import { StagesService } from './stages.service';
import { InterventionsService } from './interventions.service';
import { TransitionsService } from './transitions.service';

@Module({
  controllers: [PathwaysController],
  providers: [PathwaysService, StagesService, InterventionsService, TransitionsService],
  exports: [PathwaysService, StagesService],
})
export class PathwaysModule {}
