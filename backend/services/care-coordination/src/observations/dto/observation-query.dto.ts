import { ObservationSource } from '.prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ObservationItemQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  dataType?: string;

  @IsOptional()
  @Type(() => Boolean)
  activeOnly?: boolean = true;
}

export class PatientObservationQueryDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ObservationSource)
  source?: ObservationSource;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  observedFrom?: string;

  @IsOptional()
  @IsDateString()
  observedTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
