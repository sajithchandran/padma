import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@padma.dev', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Padma@123', description: 'User password' })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiPropertyOptional({ example: 'demo-healthcare', description: 'Tenant slug — defaults to the user\'s primary tenant' })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
