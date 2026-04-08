/**
 * Auth service — thin wrapper around the backend /api/v1/auth/* endpoints.
 * All calls go through the Next.js proxy rewrite (/api/* → backend).
 */

export interface LoginPayload {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleCode: string;
  roleId: string;
  permissions: string[];
  facilityId?: string;
}

export interface AuthTenant {
  id: string;
  slug: string;
  name: string;
  status: string;
  timezone: string;
  country: string;
}

export interface LoginResult {
  token: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: AuthUser;
  tenant: AuthTenant;
}

class AuthService {
  private readonly BASE = '/api/v1/auth';

  async login(payload: LoginPayload): Promise<LoginResult> {
    const res = await fetch(`${this.BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message ?? `Login failed (${res.status})`);
    }

    return res.json() as Promise<LoginResult>;
  }

  async logout(token: string): Promise<void> {
    // Best-effort — fire and forget
    await fetch(`${this.BASE}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {});
  }

  async getMe(token: string): Promise<{ sub: string; email: string; tenantId: string } | null> {
    try {
      const res = await fetch(`${this.BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
