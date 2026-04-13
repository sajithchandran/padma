'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Bell, ChevronDown, Settings, LogOut, User, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard':     { title: 'Dashboard', subtitle: 'Overview of care coordination activity' },
  '/patients':      { title: 'Patients', subtitle: 'Manage and monitor patient records' },
  '/pathways':      { title: 'Care Pathways', subtitle: 'Active clinical pathways and templates' },
  '/tasks':         { title: 'Tasks', subtitle: 'Manage care coordination tasks' },
  '/enrollment':    { title: 'Enrollment', subtitle: 'Patient pathway enrollment management' },
  '/communications':{ title: 'Communications', subtitle: 'Outbound and inbound patient communications' },
  '/analytics':     { title: 'Analytics & Reports', subtitle: 'Reports and performance metrics' },
  '/users':         { title: 'Users & Roles', subtitle: 'Team members, roles and permissions' },
  '/care-team':     { title: 'Care Team', subtitle: 'Tenant care-team master directory and eligible roles' },
  '/observation-items': { title: 'Observation Items', subtitle: 'Tenant clinical observation master data' },
  '/communication-templates': { title: 'Communication Templates', subtitle: 'Manage reusable outbound templates and approvals' },
  '/privacy-consent': { title: 'Privacy & Consent', subtitle: 'Manage patient communication consent records' },
  '/settings':      { title: 'Tenant Settings', subtitle: 'Organisation configuration and feature flags' },
};

const NOTIFICATIONS = [
  { id: 1, type: 'alert', title: 'CHF Weight Alert', body: 'Aisha Mohammed — 2.3 kg gain in 48h', time: '32m ago', unread: true },
  { id: 2, type: 'overdue', title: 'Task Overdue', body: 'Nephrology referral for Khalid Al-Mansoori', time: '2h ago', unread: true },
  { id: 3, type: 'info', title: 'Pathway Completed', body: 'GDM pathway completed — Lindiwe Dlamini', time: '3h ago', unread: false },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { user, tenant, token, logout: storeLogout } = useAuthStore();

  const basePath = '/' + pathname.split('/')[1];
  const page = PAGE_TITLES[basePath] ?? PAGE_TITLES[pathname] ?? { title: 'Padma' };
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  async function handleLogout() {
    setSigningOut(true);
    setProfileOpen(false);
    if (token) await authService.logout(token);
    storeLogout();
    router.push('/login');
  }

  return (
    <header className="h-16 flex-shrink-0 bg-background/50 backdrop-blur-md border-b border-border flex items-center justify-between px-6 gap-4 relative z-30 transition-all duration-300">
      {/* Left — Page title */}
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-foreground font-display tracking-tight truncate">{page.title}</h1>
        {page.subtitle && (
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{page.subtitle}</p>
        )}
      </div>

      {/* Right — Search + Theme + Notifications + Profile */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Search */}
        <div className="relative hidden md:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search patients, tasks…"
            className="h-9 w-64 pl-9 pr-3 rounded-xl border border-border bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background transition-all duration-200"
          />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="relative h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 border border-transparent hover:border-border"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-popover rounded-2xl shadow-premium border border-border overflow-hidden z-50 animate-in">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground font-display">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs text-primary font-medium cursor-pointer hover:underline">Mark all read</span>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {NOTIFICATIONS.map((n) => (
                    <div key={n.id} className={cn('px-4 py-3 flex gap-3 hover:bg-muted cursor-pointer transition-colors', n.unread && 'bg-primary/5')}>
                      <div className={cn(
                        'h-2 w-2 rounded-full mt-1.5 flex-shrink-0',
                        n.type === 'alert' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 
                        n.type === 'overdue' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 
                        'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.4)]',
                      )} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">{n.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase font-bold tracking-tighter">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-border text-center hover:bg-muted transition-colors transition-colors">
                  <span className="text-xs text-primary font-semibold cursor-pointer hover:underline">View all notifications</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-3 h-10 pl-2 pr-4 rounded-xl hover:bg-muted transition-all duration-200 border border-transparent hover:border-border"
            disabled={signingOut}
          >
            <Avatar name={user?.name ?? 'User'} size="sm" />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-foreground leading-none font-display mb-1">{user?.name ?? 'User'}</p>
              <p className="text-[10px] text-muted-foreground leading-tight capitalize font-medium">{user?.roleCode?.replace('_', ' ') ?? ''}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-active:rotate-180 hidden md:block" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-popover rounded-2xl shadow-premium border border-border overflow-hidden z-50 animate-in">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <p className="text-sm font-bold text-foreground font-display">{user?.name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground truncate mb-2">{user?.email ?? '—'}</p>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-lg border border-primary/20 uppercase tracking-wider">
                    {tenant?.name ?? 'Default'}
                  </span>
                </div>
                <div className="py-2">
                  {[
                    { icon: <User className="h-4 w-4" />, label: 'My Profile' },
                    { icon: <Settings className="h-4 w-4" />, label: 'Preferences' },
                    { icon: <HelpCircle className="h-4 w-4" />, label: 'Help & Support' },
                  ].map((item) => (
                    <button key={item.label} className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-foreground/80 hover:bg-muted transition-colors hover:text-foreground">
                      <span className="text-muted-foreground">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-border mt-1">
                  <button
                    onClick={handleLogout}
                    disabled={signingOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50 font-semibold"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
