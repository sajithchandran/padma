'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';
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
      { label: 'High Risk', href: '/patients?filter=high-risk' },
      { label: 'My Patients', href: '/patients?filter=mine' },
    ],
  },
  {
    id: 'pathways',
    label: 'Care Pathways',
    icon: <Route className="h-5 w-5" />,
    children: [
      { label: 'Active Pathways', href: '/pathways' },
      { label: 'Templates', href: '/pathways?tab=templates' },
    ],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: <CheckSquare className="h-5 w-5" />,
    children: [
      { label: 'My Tasks', href: '/tasks?filter=mine' },
      { label: 'Team Tasks', href: '/tasks?filter=team' },
      { label: 'Completed', href: '/tasks?filter=completed' },
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
        'h-screen flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out flex-shrink-0',
        sidebarCollapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-slate-700/60 flex-shrink-0',
        sidebarCollapsed ? 'h-16 justify-center px-0' : 'h-16 gap-3 px-5',
      )}>
        <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Heart className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white tracking-wide">Padma</p>
            <p className="text-[10px] text-slate-400 leading-tight">Care Coordination</p>
          </div>
        )}
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-0.5">
        {/* Main nav */}
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

        {/* Divider */}
        <div className="my-3 border-t border-slate-700/50 mx-2" />

        {/* Admin nav */}
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
      </nav>

      {/* Collapse toggle */}
      <div className="flex-shrink-0 border-t border-slate-700/60 p-2">
        <button
          onClick={toggleSidebar}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400',
            'hover:bg-slate-700/60 hover:text-white transition-colors duration-150 text-sm',
            sidebarCollapsed && 'justify-center',
          )}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed
            ? <PanelLeftOpen className="h-5 w-5" />
            : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span className="text-xs">Collapse</span>
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
    'relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 w-full cursor-pointer select-none',
    collapsed ? 'justify-center' : '',
    active
      ? 'bg-blue-600 text-white'
      : 'text-slate-400 hover:bg-slate-700/60 hover:text-white',
  );

  if (!hasChildren && item.href) {
    return (
      <Link href={item.href} className={rowBase} title={collapsed ? item.label : undefined}>
        <span className="flex-shrink-0">{item.icon}</span>
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && item.badge != null && item.badge > 0 && (
          <BadgePill count={item.badge} active={active} />
        )}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={rowBase}
        title={collapsed ? item.label : undefined}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <BadgePill count={item.badge} active={active} />
            )}
            {hasChildren && (
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200',
                  expanded ? 'rotate-0' : '-rotate-90',
                )}
              />
            )}
          </>
        )}
      </button>

      {/* Children */}
      {hasChildren && !collapsed && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            expanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="mt-0.5 ml-4 pl-4 border-l border-slate-700/50 space-y-0.5 py-0.5">
            {item.children!.map((child) => {
              const childPath = child.href.split('?')[0];
              const childActive = pathname === childPath || (childPath !== '/' && pathname.startsWith(childPath));
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-100',
                    childActive
                      ? 'text-white bg-slate-700'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/40',
                  )}
                >
                  <span className="truncate">{child.label}</span>
                  {child.badge != null && child.badge > 0 && (
                    <span className="ml-2 flex-shrink-0 h-4 min-w-4 px-1 rounded-full bg-blue-500 text-[10px] text-white font-bold flex items-center justify-center">
                      {child.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BadgePill({ count, active }: { count: number; active: boolean }) {
  return (
    <span className={cn(
      'h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0',
      active ? 'bg-white text-blue-600' : 'bg-blue-500 text-white',
    )}>
      {count}
    </span>
  );
}
