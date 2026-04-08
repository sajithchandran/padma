import { Module } from '@nestjs/common';
import { CareTeamController } from './care-team.controller';
import { CareTeamService } from './care-team.service';

@Module({
  controllers: [CareTeamController],
  providers: [CareTeamService],
  exports: [CareTeamService],
})
export class CareTeamModule {}
