'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isHydrated, token, user, hydrate, logout } = useAuthStore();

  // Step 1: hydrate auth state from sessionStorage on first client render
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Step 2: after hydration enforce auth, and silently refresh user profile
  //         on page refresh (token exists but user object not in memory).
  //         We do NOT block rendering on this — children mount immediately
  //         so page data loads without waiting for the /me round-trip.
  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Token present but no user profile in memory (happens after page refresh).
    // Fire /me in the background — if it fails the token is stale, log out.
    if (token && !user) {
      authService.getMe(token).then((me) => {
        if (!me) {
          logout();
          router.replace('/login');
        }
        // On success: user profile is available from /me but we only need it
        // for the Header display. The header handles user=null gracefully.
      });
    }
  }, [isHydrated, isAuthenticated, token, user, router, logout]);

  // Show a minimal spinner only during the initial sessionStorage hydration
  // (this is synchronous and resolves in <1 frame — just prevents a flash).
  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Not authenticated — redirect already queued, render nothing
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
