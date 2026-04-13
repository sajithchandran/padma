import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCareChatMessageDto {
  @ApiProperty({ description: 'Internal care-team chat message body' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;

  @ApiPropertyOptional({ description: 'Optional structured context for the message' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
