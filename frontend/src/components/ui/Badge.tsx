import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  | 'high' | 'medium' | 'low' | 'critical'
  | 'active' | 'pending' | 'completed' | 'overdue' | 'cancelled' | 'paused'
  | 'in_progress';

const variants: Record<BadgeVariant, string> = {
  default:    'bg-muted/50 text-muted-foreground border-transparent',
  neutral:    'bg-muted/50 text-muted-foreground border-transparent',
  success:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning:    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  danger:     'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  info:       'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  critical:   'bg-red-600/20 text-red-700 dark:text-red-300 border-red-600/30 font-bold',
  high:       'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  medium:     'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  low:        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  active:     'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  pending:    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  completed:  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  overdue:    'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  cancelled:  'bg-muted/50 text-muted-foreground border-muted-foreground/20',
  paused:     'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  in_progress:'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
};

const dotColors: Record<BadgeVariant, string> = {
  default:    'bg-muted-foreground/40',
  neutral:    'bg-muted-foreground/40',
  success:    'bg-emerald-500',
  warning:    'bg-amber-500',
  danger:     'bg-red-500',
  info:       'bg-blue-500',
  critical:   'bg-red-600',
  high:       'bg-orange-500',
  medium:     'bg-amber-500',
  low:        'bg-emerald-500',
  active:     'bg-emerald-500',
  pending:    'bg-amber-500',
  completed:  'bg-blue-500',
  overdue:    'bg-red-500',
  cancelled:  'bg-slate-400',
  paused:     'bg-purple-500',
  in_progress:'bg-sky-500',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function Badge({ variant = 'default', children, dot, className, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-lg transition-colors',
        size === 'xs' ? 'px-1 py-0 text-[10px]' : size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotColors[variant])} />
          <span className={cn('relative inline-flex rounded-full h-2 w-2', dotColors[variant])} />
        </span>
      )}
      {children}
    </span>
  );
}

// Convenience helpers
export function RiskBadge({ level }: { level: string }) {
  const map: Record<string, BadgeVariant> = {
    CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low',
  };
  return <Badge variant={map[level] ?? 'neutral'} dot>{level}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'active', INACTIVE: 'cancelled', PENDING: 'pending',
    COMPLETED: 'completed', OVERDUE: 'overdue', CANCELLED: 'cancelled',
    IN_PROGRESS: 'in_progress', PAUSED: 'paused', WITHDRAWN: 'cancelled',
    DISCHARGED: 'neutral', SUSPENDED: 'warning',
  };
  const label = status.replace('_', ' ');
  return <Badge variant={map[status] ?? 'neutral'} dot>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, BadgeVariant> = {
    URGENT: 'critical', HIGH: 'danger', NORMAL: 'info', LOW: 'neutral',
  };
  return <Badge variant={map[priority] ?? 'neutral'}>{priority}</Badge>;
}
