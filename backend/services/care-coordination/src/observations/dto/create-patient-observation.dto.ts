import { ObservationSource } from '.prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePatientObservationDto {
  @IsUUID()
  itemId!: string;

  @IsDateString()
  observedAt!: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @IsEnum(ObservationSource)
  source!: ObservationSource;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceReferenceId?: string;

  @IsOptional()
  valueNumeric?: string | number;

  @IsOptional()
  @IsString()
  valueText?: string;

  @IsOptional()
  @IsBoolean()
  valueBoolean?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  valueCoded?: string;

  @IsOptional()
  valueJson?: unknown;

  @IsOptional()
  @IsDateString()
  valueDate?: string;

  @IsOptional()
  @IsDateString()
  valueDateTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsBoolean()
  isAbnormal?: boolean;

  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  enteredByRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePatientObservationByCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  itemCode!: string;

  @IsDateString()
  observedAt!: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @IsEnum(ObservationSource)
  source!: ObservationSource;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceReferenceId?: string;

  @IsOptional()
  valueNumeric?: string | number;

  @IsOptional()
  @IsString()
  valueText?: string;

  @IsOptional()
  @IsBoolean()
  valueBoolean?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  valueCoded?: string;

  @IsOptional()
  valueJson?: unknown;

  @IsOptional()
  @IsDateString()
  valueDate?: string;

  @IsOptional()
  @IsDateString()
  valueDateTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsBoolean()
  isAbnormal?: boolean;

  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  enteredByRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
