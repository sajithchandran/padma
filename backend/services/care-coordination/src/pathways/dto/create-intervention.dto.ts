import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  MaxLength,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInterventionDto {
  @ApiProperty({
    enum: [
      'consultation', 'lab_test', 'medication', 'therapy', 'nutrition',
      'follow_up', 'assessment', 'education', 'vital_signs', 'device_reading',
      'telehealth', 'home_visit', 'bedside_monitoring', 'discharge_planning',
    ],
  })
  @IsString()
  @MaxLength(30)
  interventionType: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['outpatient', 'inpatient', 'home_care', 'any'], default: 'any' })
  @IsOptional()
  @IsString()
  @IsIn(['outpatient', 'inpatient', 'home_care', 'any'])
  careSetting?: string;

  @ApiPropertyOptional({
    enum: ['in_person', 'telehealth', 'remote_monitoring', 'self_report', 'app_based'],
    default: 'in_person',
  })
  @IsOptional()
  @IsString()
  @IsIn(['in_person', 'telehealth', 'remote_monitoring', 'self_report', 'app_based'])
  deliveryMode?: string;

  @ApiProperty({
    enum: ['once', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'custom_days'],
  })
  @IsString()
  @IsIn(['once', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'custom_days'])
  frequencyType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  frequencyValue?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  startDayOffset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  endDayOffset?: number;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  defaultOwnerRole?: string;

  @ApiPropertyOptional({
    enum: [
      'athma_opd', 'athma_lab', 'athma_pharmacy', 'athma_inpatient',
      'device_sync', 'telehealth', 'home_visit', 'patient_self_report', 'manual', 'none',
    ],
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  autoCompleteSource?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  autoCompleteEventType?: string;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  reminderConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
