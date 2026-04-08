'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Bell, ChevronDown, Settings, LogOut, User, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
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
    <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 gap-4 relative z-30">
      {/* Left — Page title */}
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-slate-900 truncate">{page.title}</h1>
        {page.subtitle && (
          <p className="text-xs text-slate-500 truncate">{page.subtitle}</p>
        )}
      </div>

      {/* Right — Search + Notifications + Profile */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients, tasks…"
            className="h-9 w-64 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="relative h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">Mark all read</span>
                  )}
                </div>
                <div className="divide-y divide-slate-50">
                  {NOTIFICATIONS.map((n) => (
                    <div key={n.id} className={cn('px-4 py-3 flex gap-3 hover:bg-slate-50 cursor-pointer', n.unread && 'bg-blue-50/40')}>
                      <div className={cn(
                        'h-2 w-2 rounded-full mt-1.5 flex-shrink-0',
                        n.type === 'alert' ? 'bg-red-500' : n.type === 'overdue' ? 'bg-amber-500' : 'bg-blue-500',
                      )} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{n.title}</p>
                        <p className="text-xs text-slate-500 truncate">{n.body}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                  <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">View all notifications</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-slate-100 transition-colors"
            disabled={signingOut}
          >
            <Avatar name={user?.name ?? 'User'} size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-none">{user?.name ?? 'Loading…'}</p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5 capitalize">{user?.roleCode?.replace('_', ' ') ?? ''}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">{user?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{user?.email ?? '—'}</p>
                  <span className="inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full ring-1 ring-blue-200">
                    {tenant?.name ?? 'Unknown tenant'}
                  </span>
                </div>
                <div className="py-1">
                  {[
                    { icon: <User className="h-4 w-4" />, label: 'My Profile' },
                    { icon: <Settings className="h-4 w-4" />, label: 'Preferences' },
                    { icon: <HelpCircle className="h-4 w-4" />, label: 'Help & Support' },
                  ].map((item) => (
                    <button key={item.label} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <span className="text-slate-400">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="py-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    disabled={signingOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
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
