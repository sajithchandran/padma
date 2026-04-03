import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  MaxLength,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStageDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  code: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['entry', 'intermediate', 'decision', 'terminal'] })
  @IsString()
  @IsIn(['entry', 'intermediate', 'decision', 'terminal'])
  stageType: string;

  @ApiPropertyOptional({ enum: ['outpatient', 'inpatient', 'home_care', 'any'], default: 'any' })
  @IsOptional()
  @IsString()
  @IsIn(['outpatient', 'inpatient', 'home_care', 'any'])
  careSetting?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedDurationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minDurationDays?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoTransition?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  entryActions?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  exitActions?: Record<string, any>;
}
