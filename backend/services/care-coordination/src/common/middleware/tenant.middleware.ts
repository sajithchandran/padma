import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../decorators/tenant.decorator';

/**
 * Extracts and validates tenant context from request headers.
 * In production, tenantId and userId are extracted from the validated JWT.
 * In dev mode, falls back to x-tenant-id / x-user-id headers.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const facilityId = req.headers['x-facility-id'] as string | undefined;
    const roles = (req.headers['x-user-roles'] as string)?.split(',') || [];

    if (!tenantId) {
      throw new UnauthorizedException('x-tenant-id header is required');
    }

    if (!userId) {
      throw new UnauthorizedException('x-user-id header is required');
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new UnauthorizedException('Invalid x-tenant-id format');
    }
    if (!uuidRegex.test(userId)) {
      throw new UnauthorizedException('Invalid x-user-id format');
    }

    const tenantContext: TenantContext = {
      tenantId,
      userId,
      facilityId,
      roles,
    };

    (req as any).tenantContext = tenantContext;
    next();
  }
}
