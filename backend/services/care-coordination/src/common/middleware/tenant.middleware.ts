import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../decorators/tenant.decorator';
import { PrismaService } from '../../database/prisma.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves tenant context for every request.
 *
 * Dev mode  (NODE_ENV !== 'production'):
 *   Reads x-tenant-id, x-user-id, x-user-roles from headers.
 *   Looks up the Role from DB by code to populate roleId + permissions[].
 *   Allows rapid local testing without a real JWT / OIDC flow.
 *
 * Production mode:
 *   Parses the Bearer JWT, extracts sub → looks up User by oidcSub,
 *   then looks up UserTenantRole for (userId, tenantId) with role + permissions.
 *   Verifies tenant is ACTIVE and user is ACTIVE before attaching context.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // Skip middleware for public routes (auth endpoints, health, webhooks).
    // NestJS .exclude() patterns can be unreliable with global prefixes,
    // so we guard here explicitly against the full URL path.
    const url = req.originalUrl ?? req.url ?? '';
    const isPublicPath =
      url.includes('/auth/') ||
      url.includes('/health') ||
      url.includes('/webhooks/');

    if (isPublicPath) return next();

    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      await this.devMiddleware(req);
    } else {
      await this.productionMiddleware(req);
    }

    next();
  }

  // ─── Dev mode: trust headers, resolve role+permissions from DB ──────────────

  private async devMiddleware(req: Request): Promise<void> {
    const tenantId  = req.headers['x-tenant-id'] as string;
    const userId    = req.headers['x-user-id'] as string;
    const facilityId = req.headers['x-facility-id'] as string | undefined;
    const roleCodeHeader = (req.headers['x-user-roles'] as string)?.split(',')[0]?.trim() ?? 'viewer';

    if (!tenantId) throw new UnauthorizedException('x-tenant-id header is required');
    if (!userId)   throw new UnauthorizedException('x-user-id header is required');
    if (!UUID_REGEX.test(tenantId)) throw new UnauthorizedException('Invalid x-tenant-id format');
    if (!UUID_REGEX.test(userId))   throw new UnauthorizedException('Invalid x-user-id format');

    // Look up Role by code (system role — tenantId null, or tenant-specific)
    const role = await this.prisma.role.findFirst({
      where: { code: roleCodeHeader, isActive: true },
      include: { permissions: { include: { permission: true } } },
    });

    const roleId   = role?.id ?? 'unknown';
    const roleCode = role?.code ?? roleCodeHeader;
    const permissions = role?.permissions.map((rp) => rp.permission.code) ?? [];

    const tenantContext: TenantContext = { tenantId, userId, roleId, roleCode, permissions, facilityId };
    (req as any).tenantContext = tenantContext;
  }

  // ─── Production mode: JWT → DB lookup ───────────────────────────────────────

  private async productionMiddleware(req: Request): Promise<void> {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header missing or malformed');
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId || !UUID_REGEX.test(tenantId)) {
      throw new UnauthorizedException('x-tenant-id header is required');
    }

    // Decode JWT payload without verification here — full RS256 verification
    // is handled by JwtAuthGuard. We only need the sub claim for DB lookup.
    const token  = authHeader.slice(7);
    const parts  = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Malformed JWT');

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Malformed JWT payload');
    }

    const oidcSub = payload['sub'] as string | undefined;
    if (!oidcSub) throw new UnauthorizedException('JWT missing sub claim');

    // Look up user
    const user = await this.prisma.user.findUnique({ where: { oidcSub } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.status !== 'ACTIVE') throw new ForbiddenException('User account is not active');

    // Look up tenant
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new UnauthorizedException('Tenant not found');
    if (tenant.status !== 'ACTIVE') throw new ForbiddenException('Tenant is suspended or offboarded');

    // Look up user's role in this tenant
    const utr = await this.prisma.userTenantRole.findFirst({
      where: { userId: user.id, tenantId, isActive: true },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!utr) throw new ForbiddenException('User has no active role in this tenant');

    const facilityId = utr.facilityId ?? undefined;
    const permissions = utr.role.permissions.map((rp) => rp.permission.code);

    const tenantContext: TenantContext = {
      tenantId,
      userId: user.id,
      roleId: utr.roleId,
      roleCode: utr.role.code,
      permissions,
      facilityId,
    };
    (req as any).tenantContext = tenantContext;
  }
}
