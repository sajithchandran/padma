import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ description: 'Role ID to assign' })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ description: 'Facility ID to scope this role to (optional)' })
  @IsUUID()
  @IsOptional()
  facilityId?: string;
}
