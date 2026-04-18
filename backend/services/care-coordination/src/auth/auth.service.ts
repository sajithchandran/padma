import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import type { LoginDto } from './dto/login.dto';

export interface AuthTokenPayload {
  sub: string;        // oidcSub — the stable identifier for the user
  email: string;
  tenantId: string;
  iat?: number;
  exp?: number;
  iss: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: {
    id: string;
    email: string;
    name: string;
    roleCode: string;
    roleId: string;
    permissions: string[];
    facilityId?: string;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: string;
    timezone: string;
    country: string;
  };
}

@Injectable()
export class AuthService {
  private readonly jwtPrivateKey: string;
  private readonly jwtPublicKey: string;
  private readonly jwtIssuer: string;
  private readonly TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.jwtPrivateKey = this.normalizePem(this.config.get<string>('auth.jwtPrivateKey'));
    this.jwtPublicKey = this.normalizePem(this.config.get<string>('auth.jwtPublicKey'));
    this.jwtIssuer = this.config.get<string>('auth.jwtIssuer') ?? 'https://auth.padma.local';
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<LoginResponse> {
    // 1. Look up the user by email
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE') throw new ForbiddenException('User account is inactive or pending');

    // 2. Verify password
    if (!user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    // 3. Find the user's tenant role
    //    If tenantSlug supplied, look for that specific tenant; otherwise use first active role.
    let userTenantRole: any = null;

    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
      if (!tenant) throw new NotFoundException(`Tenant '${dto.tenantSlug}' not found`);
      if (tenant.status !== 'ACTIVE') throw new ForbiddenException('Tenant is suspended');

      userTenantRole = await this.prisma.userTenantRole.findFirst({
        where: { userId: user.id, tenantId: tenant.id, isActive: true },
        include: {
          tenant: true,
          role: { include: { permissions: { include: { permission: true } } } },
        },
      });
    } else {
      userTenantRole = await this.prisma.userTenantRole.findFirst({
        where: { userId: user.id, isActive: true },
        include: {
          tenant: true,
          role: { include: { permissions: { include: { permission: true } } } },
        },
        orderBy: { grantedAt: 'asc' },
      });
    }

    if (!userTenantRole) throw new ForbiddenException('No active tenant role found for this user');
    if (userTenantRole.tenant.status !== 'ACTIVE') throw new ForbiddenException('Tenant is suspended');

    // 4. Sign a JWT
    const payload: AuthTokenPayload = {
      sub: user.oidcSub,
      email: user.email,
      tenantId: userTenantRole.tenantId,
      iss: this.jwtIssuer,
    };

    if (!this.jwtPrivateKey) {
      throw new InternalServerErrorException('JWT private key is not configured');
    }

    const token = jwt.sign(payload, this.jwtPrivateKey, {
      algorithm: 'RS256',
      expiresIn: this.TOKEN_TTL_SECONDS,
    });

    // 5. Build the response
    const permissions = userTenantRole.role.permissions.map(
      (rp: any) => rp.permission.code as string,
    );

    // Extract a display name from email if no profile name stored
    const name = this.emailToName(user.email);

    return {
      token,
      expiresIn: this.TOKEN_TTL_SECONDS,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name,
        roleCode: userTenantRole.role.code,
        roleId: userTenantRole.roleId,
        permissions,
        facilityId: userTenantRole.facilityId ?? undefined,
      },
      tenant: {
        id: userTenantRole.tenant.id,
        slug: userTenantRole.tenant.slug,
        name: userTenantRole.tenant.name,
        status: userTenantRole.tenant.status,
        timezone: userTenantRole.tenant.timezone,
        country: userTenantRole.tenant.country,
      },
    };
  }

  // ─── Verify (used by /auth/me for RS256 tokens) ─────────────────────────

  verifyToken(token: string): AuthTokenPayload {
    if (!this.jwtPublicKey) {
      throw new UnauthorizedException('JWT public key is not configured');
    }

    try {
      return jwt.verify(token, this.jwtPublicKey, {
        algorithms: ['RS256'],
        issuer: this.jwtIssuer,
      }) as AuthTokenPayload;
    } catch (err: any) {
      throw new UnauthorizedException(`Invalid or expired token: ${err.message}`);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Hash a plain-text password. Use when creating / changing passwords. */
  static async hashPassword(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, 12);
  }

  private emailToName(email: string): string {
    const local = email.split('@')[0];
    return local
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private normalizePem(value?: string): string {
    return value?.replace(/\\n/g, '\n').trim() ?? '';
  }
}
