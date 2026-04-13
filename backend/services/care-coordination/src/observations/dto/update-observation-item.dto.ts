import { PartialType } from '@nestjs/swagger';
import { CreateObservationItemDto } from './create-observation-item.dto';

export class UpdateObservationItemDto extends PartialType(CreateObservationItemDto) {}
