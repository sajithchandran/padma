import { Global, Module } from '@nestjs/common';
import { PrismaCoreService } from './prisma-core.service';
import { PrismaEngagementService } from './prisma-engagement.service';

@Global()
@Module({
  providers: [PrismaCoreService, PrismaEngagementService],
  exports: [PrismaCoreService, PrismaEngagementService],
})
export class DatabaseModule {}
