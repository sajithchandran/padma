import { PartialType } from '@nestjs/swagger';
import { CreatePathwayDto } from './create-pathway.dto';

export class UpdatePathwayDto extends PartialType(CreatePathwayDto) {}
