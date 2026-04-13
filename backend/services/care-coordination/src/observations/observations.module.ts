import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { ObservationsController } from './observations.controller';
import { ObservationsService } from './observations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ObservationsController],
  providers: [ObservationsService],
  exports: [ObservationsService],
})
export class ObservationsModule {}
