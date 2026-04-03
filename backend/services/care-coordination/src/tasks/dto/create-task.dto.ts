import {
  IsUUID,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDate,
  IsObject,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InterventionType {
  CONSULTATION = 'consultation',
  LAB_TEST = 'lab_test',
  MEDICATION = 'medication',
  THERAPY = 'therapy',
  NUTRITION = 'nutrition',
  FOLLOW_UP = 'follow_up',
  ASSESSMENT = 'assessment',
  EDUCATION = 'education',
  VITAL_SIGNS = 'vital_signs',
  DEVICE_READING = 'device_reading',
  TELEHEALTH = 'telehealth',
  HOME_VISIT = 'home_visit',
  BEDSIDE_MONITORING = 'bedside_monitoring',
  DISCHARGE_PLANNING = 'discharge_planning',
}

export enum CareSetting {
  OUTPATIENT = 'outpatient',
  INPATIENT = 'inpatient',
  HOME_CARE = 'home_care',
  ANY = 'any',
}

export enum DeliveryMode {
  IN_PERSON = 'in_person',
  TELEHEALTH = 'telehealth',
  REMOTE_MONITORING = 'remote_monitoring',
  SELF_REPORT = 'self_report',
  APP_BASED = 'app_based',
}

export class CreateTaskDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  enrollmentId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  stageId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: InterventionType })
  @IsEnum(InterventionType)
  interventionType: InterventionType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CareSetting })
  @IsEnum(CareSetting)
  careSetting: CareSetting;

  @ApiProperty({ enum: DeliveryMode })
  @IsEnum(DeliveryMode)
  deliveryMode: DeliveryMode;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  dueDate: Date;

  @ApiPropertyOptional({ description: 'HH:MM format' })
  @IsOptional()
  @IsString()
  dueTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  windowStartDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  windowEndDate?: Date;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToRole?: string;

  @ApiProperty({ minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  priority: number;

  @ApiProperty()
  @IsBoolean()
  isCritical: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  autoCompleteSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  autoCompleteEventType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
