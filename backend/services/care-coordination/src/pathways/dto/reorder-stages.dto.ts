import { IsUUID, IsInt, IsArray, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StageOrderItemDto {
  @ApiProperty({ format: 'uuid', description: 'Stage ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'New sort order (0-based)' })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderStagesDto {
  @ApiProperty({ type: [StageOrderItemDto], description: 'Ordered list of stage IDs and their new sort positions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageOrderItemDto)
  stages: StageOrderItemDto[];
}
