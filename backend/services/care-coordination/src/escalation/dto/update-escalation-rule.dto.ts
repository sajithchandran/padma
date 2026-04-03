import { PartialType } from '@nestjs/swagger';
import { CreateEscalationRuleDto } from './create-escalation-rule.dto';

export class UpdateEscalationRuleDto extends PartialType(CreateEscalationRuleDto) {}
