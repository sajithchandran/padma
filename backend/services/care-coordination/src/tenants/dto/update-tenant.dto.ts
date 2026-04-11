import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsEmail } from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(10)
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Pathway code format. Supported tokens: {YYYY}, {YY}, {CATEGORY}, {SEQ4}, {SEQ3}, {SEQ}',
    example: 'PW-{YYYY}-{SEQ4}',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  pathwayCodeFormat?: string;
}
