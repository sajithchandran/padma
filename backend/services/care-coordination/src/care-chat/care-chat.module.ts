import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { CareChatController } from './care-chat.controller';
import { CareChatService } from './care-chat.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CareChatController],
  providers: [CareChatService],
  exports: [CareChatService],
})
export class CareChatModule {}
