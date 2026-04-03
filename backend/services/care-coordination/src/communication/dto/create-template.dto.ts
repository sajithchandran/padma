import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel } from './send-message.dto';

export enum TemplateCategory {
  REMINDER = 'reminder',
  ESCALATION = 'escalation',
  WELCOME = 'welcome',
  TRANSITION = 'transition',
  GRADUATION = 'graduation',
  AD_HOC = 'ad_hoc',
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Unique code identifier for the template' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Human-readable name for the template' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: MessageChannel })
  @IsEnum(MessageChannel)
  channel: MessageChannel;

  @ApiPropertyOptional({ default: 'en', description: 'BCP 47 language tag' })
  @IsOptional()
  @IsString()
  language?: string = 'en';

  @ApiPropertyOptional({ description: 'Email subject line (required for email channel)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    description: 'Mustache template body. Use {{variableName}} for substitutions.',
  })
  @IsString()
  @IsNotEmpty()
  bodyTemplate: string;

  @ApiPropertyOptional({
    description: 'JSON schema describing expected variable names for validation',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiProperty({ enum: TemplateCategory })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;
}
