import { IsUUID, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManualTransitionDto {
  @ApiProperty({ description: 'Target stage ID to transition into' })
  @IsUUID()
  toStageId: string;

  @ApiProperty({ description: 'Reason for the manual stage transition' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}
