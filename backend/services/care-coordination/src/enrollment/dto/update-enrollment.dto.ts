import { PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CareTeamMemberDto } from './create-enrollment.dto';

class UpdateEnrollmentBaseDto {
  @ApiPropertyOptional({ description: 'Primary care coordinator user ID' })
  @IsOptional()
  @IsUUID()
  primaryCoordinatorId?: string;

  @ApiPropertyOptional({
    description: 'Updated care team',
    type: [CareTeamMemberDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareTeamMemberDto)
  careTeam?: CareTeamMemberDto[];

  @ApiPropertyOptional({ description: 'Enrollment notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Current care setting',
    example: 'outpatient',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  currentCareSetting?: string;
}

export class UpdateEnrollmentDto extends PartialType(UpdateEnrollmentBaseDto) {}
