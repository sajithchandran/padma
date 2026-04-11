import { PartialType } from '@nestjs/swagger';
import { CreateCareTaskTemplateDto } from './create-care-task-template.dto';

export class UpdateCareTaskTemplateDto extends PartialType(CreateCareTaskTemplateDto) {}
