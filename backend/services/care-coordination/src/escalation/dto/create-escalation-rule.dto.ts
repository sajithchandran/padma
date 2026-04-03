import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EscalationTriggerType {
  TASK_OVERDUE = 'task_overdue',
  TASK_CRITICAL_OVERDUE = 'task_critical_overdue',
  PATIENT_INACTIVE = 'patient_inactive',
  ADHERENCE_BELOW_THRESHOLD = 'adherence_below_threshold',
}

export type EscalationAction =
  | 'send_reminder'
  | 'notify_coordinator'
  | 'schedule_call'
  | 'alert_supervisor';

export class EscalationChainStepDto {
  @ApiProperty({ description: 'Step level within the escalation chain (1 = first)' })
  @IsInt()
  @Min(1)
  level: number;

  @ApiProperty({
    enum: ['send_reminder', 'notify_coordinator', 'schedule_call', 'alert_supervisor'],
  })
  @IsEnum(['send_reminder', 'notify_coordinator', 'schedule_call', 'alert_supervisor'])
  action: EscalationAction;

  @ApiPropertyOptional({ description: 'Delivery channel override (e.g. sms, email, push)' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({ description: 'Hours to wait before this step fires after the trigger' })
  @IsNumber()
  @Min(0)
  delayHours: number;
}

export class CreateEscalationRuleDto {
  @ApiProperty({ description: 'Human-readable rule name (must be unique per tenant)' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: EscalationTriggerType })
  @IsEnum(EscalationTriggerType)
  triggerType: EscalationTriggerType;

  @ApiProperty({
    description: 'JSON DSL condition expression evaluated against task/enrollment context',
  })
  @IsObject()
  conditionExpr: Record<string, unknown>;

  @ApiProperty({ description: 'Rule evaluation priority (lower = higher priority)', minimum: 1, maximum: 200 })
  @IsInt()
  @Min(1)
  @Max(200)
  priority: number;

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ type: [EscalationChainStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationChainStepDto)
  escalationChain: EscalationChainStepDto[];
}
