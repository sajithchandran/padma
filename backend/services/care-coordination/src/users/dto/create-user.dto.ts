import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Email address for the user' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ description: 'First name of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Display name of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiProperty({ description: 'Role ID to assign in the current tenant' })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ description: 'Optional facility ID scope for this tenant membership' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;
}
