import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  MaxLength,
  Min,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateStageDto } from './create-stage.dto';

export class CreatePathwayDto {
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

  @ApiProperty({
    enum: ['diabetes', 'hypertension', 'cardiac', 'rehab', 'respiratory', 'oncology', 'wellness', 'custom'],
  })
  @IsString()
  @IsIn(['diabetes', 'hypertension', 'cardiac', 'rehab', 'respiratory', 'oncology', 'wellness', 'custom'])
  @MaxLength(50)
  category: string;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableSettings?: string[];

  @ApiProperty()
  @IsInt()
  @Min(1)
  defaultDurationDays: number;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  externalSourceSystem?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalSourceId?: string;

  @ApiPropertyOptional({ type: [CreateStageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStageDto)
  stages?: CreateStageDto[];
}
