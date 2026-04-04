import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Machine-readable code e.g. "custom_nurse_lead"' })
  @IsString()
  @MaxLength(100)
  code!: string;

  @ApiProperty({ description: 'Human-readable name e.g. "Nurse Lead"' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Permission IDs to assign to this role' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permissionIds?: string[];
}
