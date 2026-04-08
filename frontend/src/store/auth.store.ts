'use client';
import { create } from 'zustand';
import type { AuthUser, AuthTenant } from '@/services/auth.service';

// ─── Session storage keys (must match src/lib/api.ts interceptor) ────────────
const KEY_TOKEN    = 'padma_token';
const KEY_TENANT   = 'padma_tenant_id';
const KEY_USER     = 'padma_user_id';
const KEY_ROLE     = 'padma_user_role';

function writeSession(token: string, user: AuthUser, tenant: AuthTenant) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KEY_TOKEN,  token);
  sessionStorage.setItem(KEY_TENANT, tenant.id);
  sessionStorage.setItem(KEY_USER,   user.id);
  sessionStorage.setItem(KEY_ROLE,   user.roleCode);
}

function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(KEY_TOKEN);
  sessionStorage.removeItem(KEY_TENANT);
  sessionStorage.removeItem(KEY_USER);
  sessionStorage.removeItem(KEY_ROLE);
}

function readSession(): { token: string | null; tenantId: string | null; userId: string | null; roleCode: string | null } {
  if (typeof window === 'undefined') return { token: null, tenantId: null, userId: null, roleCode: null };
  return {
    token:    sessionStorage.getItem(KEY_TOKEN),
    tenantId: sessionStorage.getItem(KEY_TENANT),
    userId:   sessionStorage.getItem(KEY_USER),
    roleCode: sessionStorage.getItem(KEY_ROLE),
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AuthStore {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  /** Called after a successful backend login */
  setAuth: (user: AuthUser, tenant: AuthTenant, token: string) => void;

  /** Clear auth state and sessionStorage */
  logout: () => void;

  /** Restore state from sessionStorage on client mount (call once in a top-level component) */
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  tenant: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: (user, tenant, token) => {
    writeSession(token, user, tenant);
    set({ user, tenant, token, isAuthenticated: true });
  },

  logout: () => {
    clearSession();
    set({ user: null, tenant: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    if (get().isHydrated) return;
    const { token } = readSession();
    // We only restore the isAuthenticated flag — the full user/tenant
    // profile will be re-fetched by the app after hydration if needed.
    set({ token, isAuthenticated: !!token, isHydrated: true });
  },
}));
