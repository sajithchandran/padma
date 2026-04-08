import { PartialType } from '@nestjs/swagger';
import { CreateTransitionRuleDto } from './create-transition-rule.dto';

export class UpdateTransitionRuleDto extends PartialType(CreateTransitionRuleDto) {}
