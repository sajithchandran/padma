'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant } from '@/types';

interface AuthStore {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tenant: Tenant, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, tenant, token) =>
        set({ user, tenant, token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, tenant: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'padma-auth',
      skipHydration: true,
    },
  ),
);
