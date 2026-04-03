import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TaskStatus {
  PENDING = 'pending',
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled',
}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  completionNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  completionMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  completionEvidence?: Record<string, unknown>;
}
