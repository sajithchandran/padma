import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ConsentService } from './consent.service';
import { PrivacyService } from './privacy.service';
import { PrivacyController } from './privacy.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [PrivacyController],
  providers: [ConsentService, PrivacyService],
  exports: [ConsentService],
})
export class PrivacyModule {}
