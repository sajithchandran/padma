'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Route, CheckSquare, ClipboardList,
  MessageSquare, BarChart2, Shield, ChevronDown,
  PanelLeftClose, PanelLeftOpen, Heart,
} from 'lucide-react';

// ─── Nav Tree ────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavChild[];
  exact?: boolean;
}

interface NavChild {
  label: string;
  href: string;
  badge?: number;
}

const NAV_MAIN: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    exact: true,
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: <Users className="h-5 w-5" />,
    children: [
      { label: 'All Patients', href: '/patients' },
      { label: 'My Patients', href: '/patients?filter=mine' },
    ],
  },
  {
    id: 'pathways',
    label: 'Care Pathways',
    icon: <Route className="h-5 w-5" />,
    children: [
      { label: 'Active Pathways', href: '/pathways' },
      { label: 'Pathway Builder', href: '/pathways/new/builder' },
    ],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: <CheckSquare className="h-5 w-5" />,
    children: [
      { label: 'My Tasks', href: '/tasks?filter=mine' },
      { label: 'Team Tasks', href: '/tasks?filter=team' },
    ],
  },
  {
    id: 'enrollment',
    label: 'Enrollment',
    href: '/enrollment',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    id: 'communications',
    label: 'Communications',
    href: '/communications',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: <BarChart2 className="h-5 w-5" />,
    exact: true,
  },
];

const NAV_ADMIN: NavItem[] = [
  {
    id: 'admin',
    label: 'Administration',
    icon: <Shield className="h-5 w-5" />,
    children: [
      { label: 'Users & Roles', href: '/users' },
      { label: 'Care Team', href: '/care-team' },
      { label: 'Communication Templates', href: '/communication-templates' },
      { label: 'Privacy & Consent', href: '/privacy-consent' },
      { label: 'Tenant Settings', href: '/settings' },
    ],
  },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, expandedGroups, toggleGroup } = useUIStore();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href) && href !== '/';
  }

  function isGroupActive(item: NavItem): boolean {
    if (item.href) return isActive(item.href, item.exact);
    return item.children?.some((c) => pathname.startsWith(c.href.split('?')[0])) ?? false;
  }

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out flex-shrink-0 z-40 relative group',
        sidebarCollapsed ? 'w-[80px]' : 'w-[260px]',
      )}
    >
      {/* Decorative Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black pointer-events-none opacity-50" />
      
      {/* Logo Section */}
      <div className={cn(
        'relative flex items-center border-b border-white/5 flex-shrink-0 transition-all duration-300',
        sidebarCollapsed ? 'h-20 justify-center px-0' : 'h-20 gap-3 px-6',
      )}>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20"
        >
          <Heart className="h-5 w-5 text-white" strokeWidth={2.5} />
        </motion.div>
        {!sidebarCollapsed && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-0"
          >
            <p className="text-lg font-bold text-white tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Padma</p>
            <p className="text-[10px] text-slate-500 leading-tight font-bold uppercase tracking-widest -mt-0.5">Clinical Suites</p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto py-6 px-3 space-y-1.5 custom-scrollbar">
        {!sidebarCollapsed && <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4">Main Menu</p>}
        {NAV_MAIN.map((item) => (
          <NavItemRow
            key={item.id}
            item={item}
            collapsed={sidebarCollapsed}
            expanded={expandedGroups.includes(item.id)}
            active={isGroupActive(item)}
            onToggle={() => toggleGroup(item.id)}
            pathname={pathname}
          />
        ))}

        <div className="py-4">
          {!sidebarCollapsed && <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4">System</p>}
          <div className="h-px bg-white/5 mx-4 mb-4" />
          {NAV_ADMIN.map((item) => (
            <NavItemRow
              key={item.id}
              item={item}
              collapsed={sidebarCollapsed}
              expanded={expandedGroups.includes(item.id)}
              active={isGroupActive(item)}
              onToggle={() => toggleGroup(item.id)}
              pathname={pathname}
            />
          ))}
        </div>
      </nav>

      {/* Footer / Toggle */}
      <div className="relative flex-shrink-0 border-t border-white/5 p-4">
        <button
          onClick={toggleSidebar}
          className={cn(
            'group/toggle w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
            'hover:bg-white/5 text-slate-500 hover:text-white',
            sidebarCollapsed && 'justify-center',
          )}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed
            ? <PanelLeftOpen className="h-5 w-5 transition-transform group-hover/toggle:scale-110" />
            : (
              <>
                <PanelLeftClose className="h-5 w-5 transition-transform group-hover/toggle:scale-110" />
                <span className="text-xs font-bold uppercase tracking-widest">Collapse</span>
              </>
            )
          }
        </button>
      </div>
    </aside>
  );
}

// ─── NavItemRow ────────────────────────────────────────────────────────────────

interface NavItemRowProps {
  item: NavItem;
  collapsed: boolean;
  expanded: boolean;
  active: boolean;
  onToggle: () => void;
  pathname: string;
}

function NavItemRow({ item, collapsed, expanded, active, onToggle, pathname }: NavItemRowProps) {
  const hasChildren = Boolean(item.children?.length);

  const rowBase = cn(
    'relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 w-full cursor-pointer select-none group/row',
    collapsed ? 'justify-center px-0 h-12 w-12 mx-auto mb-2' : '',
    active
      ? 'bg-primary/10 text-primary shadow-sm'
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
  );

  const activeIndicator = active && (
    <motion.div 
      layoutId="active-nav-indicator"
      className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
    />
  );

  if (!hasChildren && item.href) {
    return (
      <Link href={item.href} className={rowBase} title={collapsed ? item.label : undefined}>
        {activeIndicator}
        <span className={cn('flex-shrink-0 transition-transform group-hover/row:scale-110', active ? 'text-primary' : '')}>{item.icon}</span>
        {!collapsed && <span className="flex-1 truncate tracking-tight">{item.label}</span>}
        {!collapsed && item.badge != null && item.badge > 0 && (
          <BadgePill count={item.badge} active={active} />
        )}
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className={rowBase}
        title={collapsed ? item.label : undefined}
      >
        {activeIndicator}
        <span className={cn('flex-shrink-0 transition-transform group-hover/row:scale-110', active ? 'text-primary' : '')}>{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left tracking-tight">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <BadgePill count={item.badge} active={active} />
            )}
            {hasChildren && (
              <ChevronDown
                className={cn(
                  'h-4 w-4 flex-shrink-0 transition-transform duration-300 text-slate-600 group-hover/row:text-slate-400',
                  expanded ? 'rotate-0' : '-rotate-90',
                )}
              />
            )}
          </>
        )}
      </button>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && !collapsed && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-9 border-l border-white/5 space-y-1 py-1">
              {item.children!.map((child) => {
                const childPath = child.href.split('?')[0];
                const childActive = pathname === childPath || (childPath !== '/' && pathname.startsWith(childPath));
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      'flex items-center justify-between px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200',
                      childActive
                        ? 'text-white'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
                    )}
                  >
                    <span className="truncate">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BadgePill({ count, active }: { count: number; active: boolean }) {
  return (
    <span className={cn(
      'h-4 min-w-4 px-1 rounded bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0',
      active ? 'bg-primary text-white' : '',
    )}>
      {count}
    </span>
  );
}
