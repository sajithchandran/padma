import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  IsUUID,
  MaxLength,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransitionRuleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fromStageId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toStageId: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  ruleName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ruleDescription?: string;

  @ApiProperty({ enum: ['outcome_based', 'time_based', 'manual', 'event_based'] })
  @IsString()
  @IsIn(['outcome_based', 'time_based', 'manual', 'event_based'])
  triggerType: string;

  @ApiProperty()
  @IsObject()
  conditionExpr: Record<string, any>;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(32767)
  priority?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  transitionActions?: Record<string, any>;
}
