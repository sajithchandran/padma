import { Injectable } from '@nestjs/common';
import { z } from 'zod';

type Operator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'exists';

const ALLOWED_OPERATORS = new Set<Operator>([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'contains',
  'exists',
]);

const LeafConditionSchema: z.ZodType<{
  field: string;
  op: string;
  value?: unknown;
}> = z.object({
  field: z.string().min(1),
  op: z.string().min(1),
  value: z.unknown().optional(),
});

export const ConditionExprSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.object({
      and: z.array(ConditionExprSchema),
    }),
    z.object({
      or: z.array(ConditionExprSchema),
    }),
    z.object({
      not: ConditionExprSchema,
    }),
    LeafConditionSchema,
  ]),
);

@Injectable()
export class ConditionEvaluatorService {
  evaluate(condition: unknown, context: Record<string, unknown>): boolean {
    if (condition === null || condition === undefined || typeof condition !== 'object') {
      return false;
    }

    const node = condition as Record<string, unknown>;

    if ('and' in node) {
      const clauses = node['and'];
      if (!Array.isArray(clauses)) return false;
      return clauses.every((c) => this.evaluate(c, context));
    }

    if ('or' in node) {
      const clauses = node['or'];
      if (!Array.isArray(clauses)) return false;
      return clauses.some((c) => this.evaluate(c, context));
    }

    if ('not' in node) {
      return !this.evaluate(node['not'], context);
    }

    if ('field' in node && 'op' in node) {
      const field = node['field'];
      const op = node['op'];

      if (typeof field !== 'string' || typeof op !== 'string') return false;
      if (!ALLOWED_OPERATORS.has(op as Operator)) return false;

      const resolvedValue = this.resolvePath(field, context);

      return this.applyOperator(op as Operator, resolvedValue, node['value']);
    }

    return false;
  }

  private resolvePath(path: string, context: Record<string, unknown>): unknown {
    const parts = path.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private applyOperator(op: Operator, fieldValue: unknown, ruleValue: unknown): boolean {
    switch (op) {
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;

      case 'eq':
        return fieldValue === ruleValue;

      case 'neq':
        return fieldValue !== ruleValue;

      case 'gt':
        if (typeof fieldValue !== 'number' || typeof ruleValue !== 'number') return false;
        return fieldValue > ruleValue;

      case 'gte':
        if (typeof fieldValue !== 'number' || typeof ruleValue !== 'number') return false;
        return fieldValue >= ruleValue;

      case 'lt':
        if (typeof fieldValue !== 'number' || typeof ruleValue !== 'number') return false;
        return fieldValue < ruleValue;

      case 'lte':
        if (typeof fieldValue !== 'number' || typeof ruleValue !== 'number') return false;
        return fieldValue <= ruleValue;

      case 'in':
        if (!Array.isArray(ruleValue)) return false;
        return ruleValue.includes(fieldValue);

      case 'not_in':
        if (!Array.isArray(ruleValue)) return false;
        return !ruleValue.includes(fieldValue);

      case 'contains':
        if (typeof fieldValue !== 'string' || typeof ruleValue !== 'string') return false;
        return fieldValue.includes(ruleValue);

      default:
        return false;
    }
  }
}
