import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateCareTeamMemberDto {
  @ApiProperty({ description: 'User ID of the care team member' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Role ID assigned to the member within this care team' })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ description: 'Optional facility ID scope for this membership' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;
}

export class CreateCareTeamDto {
  @ApiProperty({ description: 'Human-readable care team name', example: 'Diabetes CCM Team A' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Optional description for the care team' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ type: [CreateCareTeamMemberDto], description: 'Initial team members' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCareTeamMemberDto)
  members?: CreateCareTeamMemberDto[];
}
