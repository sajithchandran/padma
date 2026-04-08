import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateCareTeamMemberDto } from './create-care-team.dto';

export class UpdateCareTeamDto {
  @ApiPropertyOptional({ description: 'Human-readable care team name', example: 'Diabetes CCM Team A' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Optional description for the care team' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ type: [CreateCareTeamMemberDto], description: 'Updated full member list for the team' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCareTeamMemberDto)
  members?: CreateCareTeamMemberDto[];
}
