import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../database/prisma.service';
import type { TenantContext } from '../decorators/tenant.decorator';

interface VerifiedJwtPayload extends jwt.JwtPayload {
  sub: string;
  tenantId: string;
  email?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const url = request.originalUrl ?? request.url ?? '';

    if (this.isPublicPath(url)) {
      return true;
    }

    const token = this.extractBearerToken(request.headers?.authorization);
    const payload = this.verifyToken(token);

    const tenantContext = await this.resolveTenantContext(payload);
    request.jwtPayload = payload;
    request.tenantContext = tenantContext;

    return true;
  }

  private isPublicPath(url: string): boolean {
    return (
      url.includes('/auth/login')
      || url.includes('/health')
      || url.includes('/webhooks/')
      || url.includes('/api/docs')
      || url.includes('/api-json')
      || url.includes('/api-docs')
    );
  }

  private extractBearerToken(authHeader?: string): string {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header missing or malformed');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Authorization bearer token is empty');
    }

    return token;
  }

  private verifyToken(token: string): VerifiedJwtPayload {
    const publicKey = this.normalizePem(this.config.get<string>('auth.jwtPublicKey'));
    const issuer = this.config.get<string>('auth.jwtIssuer');

    if (!publicKey) {
      throw new UnauthorizedException('JWT public key is not configured');
    }

    try {
      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer,
      });

      if (typeof payload === 'string') {
        throw new UnauthorizedException('JWT payload must be an object');
      }

      if (!payload.sub) {
        throw new UnauthorizedException('JWT missing sub claim');
      }

      if (typeof payload.tenantId !== 'string' || !payload.tenantId.trim()) {
        throw new UnauthorizedException('JWT missing tenantId claim');
      }

      return payload as VerifiedJwtPayload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown JWT verification error';
      throw new UnauthorizedException(`Invalid or expired token: ${message}`);
    }
  }

  private async resolveTenantContext(payload: VerifiedJwtPayload): Promise<TenantContext> {
    const user = await this.prisma.user.findUnique({
      where: { oidcSub: payload.sub },
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.status !== 'ACTIVE') throw new ForbiddenException('User account is not active');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: payload.tenantId },
    });
    if (!tenant) throw new UnauthorizedException('Tenant not found');
    if (tenant.status !== 'ACTIVE') throw new ForbiddenException('Tenant is suspended or offboarded');

    const userTenantRole = await this.prisma.userTenantRole.findFirst({
      where: {
        userId: user.id,
        tenantId: tenant.id,
        isActive: true,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
    if (!userTenantRole) {
      throw new ForbiddenException('User has no active role in this tenant');
    }

    return {
      tenantId: tenant.id,
      userId: user.id,
      roleId: userTenantRole.roleId,
      roleCode: userTenantRole.role.code,
      permissions: userTenantRole.role.permissions.map((rolePermission) => rolePermission.permission.code),
      facilityId: userTenantRole.facilityId ?? undefined,
    };
  }

  private normalizePem(value?: string): string {
    return value?.replace(/\\n/g, '\n').trim() ?? '';
  }
}
