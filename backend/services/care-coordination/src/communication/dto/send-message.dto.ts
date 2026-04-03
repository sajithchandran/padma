import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
}

export enum MessagePurpose {
  REMINDER = 'reminder',
  ESCALATION = 'escalation',
  WELCOME = 'welcome',
  TRANSITION = 'transition',
  GRADUATION = 'graduation',
  AD_HOC = 'ad_hoc',
}

export class SendMessageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ enum: MessageChannel })
  @IsEnum(MessageChannel)
  channel: MessageChannel;

  @ApiProperty({ description: 'Template code to look up and render' })
  @IsString()
  @IsNotEmpty()
  templateCode: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Key-value pairs for template variable substitution',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiProperty({ enum: MessagePurpose })
  @IsEnum(MessagePurpose)
  purpose: MessagePurpose;

  @ApiPropertyOptional({ description: 'Entity type this message relates to (e.g. enrollment, task)' })
  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;

  @ApiPropertyOptional({ description: 'Client-supplied idempotency key to prevent duplicate sends' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
