import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CareTeamMemberDto {
  @ApiProperty({ description: 'User ID of the care team member' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Role in the care team', example: 'nurse' })
  @IsString()
  @MaxLength(50)
  role: string;

  @ApiPropertyOptional({ description: 'Display name of the team member' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class CreateEnrollmentDto {
  @ApiProperty({ description: 'Clinical pathway ID to enroll the patient into' })
  @IsUUID()
  pathwayId: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Snapshot of patient display name at enrollment time' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  patientDisplayName?: string;

  @ApiPropertyOptional({ description: 'Snapshot of patient MRN' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  patientMrn?: string;

  @ApiPropertyOptional({ description: 'Snapshot of patient gender (M/F/O)' })
  @IsOptional()
  @IsString()
  @MaxLength(1)
  patientGender?: string;

  @ApiPropertyOptional({ description: 'Snapshot of patient date of birth' })
  @IsOptional()
  @IsDateString()
  patientDob?: string;

  @ApiPropertyOptional({ description: 'Enrollment start date (defaults to today)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Expected end date (calculated from pathway if omitted)' })
  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;

  @ApiPropertyOptional({ description: 'Primary care coordinator user ID' })
  @IsOptional()
  @IsUUID()
  primaryCoordinatorId?: string;

  @ApiPropertyOptional({
    description: 'Care team members',
    type: [CareTeamMemberDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareTeamMemberDto)
  careTeam?: CareTeamMemberDto[];

  @ApiPropertyOptional({ description: 'External Athma patient reference ID' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  athmaPatientId?: string;

  @ApiPropertyOptional({ description: 'External Athma product reference ID' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  athmaProductId?: string;

  @ApiPropertyOptional({ description: 'Optional notes for the enrollment' })
  @IsOptional()
  @IsString()
  notes?: string;
}
