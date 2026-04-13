import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateObservationItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  dataType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  allowedValues?: unknown;

  @IsOptional()
  normalRangeMin?: string | number;

  @IsOptional()
  normalRangeMax?: string | number;

  @IsOptional()
  criticalLow?: string | number;

  @IsOptional()
  criticalHigh?: string | number;

  @IsOptional()
  @IsInt()
  @Min(0)
  precisionScale?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
