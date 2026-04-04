import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  tenantId: string;
  userId: string;
  roleId: string;
  // Role.id from DB (UUID)
  roleCode: string;
  // Role.code e.g. "admin", "care_coordinator", "supervisor"
  permissions: string[];
  // Permission.code[] resolved for this user e.g. ["pathway:create", "task:complete", ...]
  facilityId?: string;
}

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext;
  },
);
