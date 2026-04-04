import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  | 'high' | 'medium' | 'low' | 'critical'
  | 'active' | 'pending' | 'completed' | 'overdue' | 'cancelled' | 'paused'
  | 'in_progress';

const variants: Record<BadgeVariant, string> = {
  default:    'bg-slate-100 text-slate-700 ring-slate-200',
  neutral:    'bg-slate-100 text-slate-600 ring-slate-200',
  success:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning:    'bg-amber-50 text-amber-700 ring-amber-200',
  danger:     'bg-red-50 text-red-700 ring-red-200',
  info:       'bg-blue-50 text-blue-700 ring-blue-200',
  critical:   'bg-red-100 text-red-800 ring-red-300',
  high:       'bg-orange-50 text-orange-700 ring-orange-200',
  medium:     'bg-amber-50 text-amber-700 ring-amber-200',
  low:        'bg-emerald-50 text-emerald-700 ring-emerald-200',
  active:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending:    'bg-amber-50 text-amber-700 ring-amber-200',
  completed:  'bg-blue-50 text-blue-700 ring-blue-200',
  overdue:    'bg-red-50 text-red-700 ring-red-200',
  cancelled:  'bg-slate-100 text-slate-500 ring-slate-200',
  paused:     'bg-purple-50 text-purple-700 ring-purple-200',
  in_progress:'bg-sky-50 text-sky-700 ring-sky-200',
};

const dotColors: Record<BadgeVariant, string> = {
  default:    'bg-slate-400',
  neutral:    'bg-slate-400',
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
  size?: 'sm' | 'md';
}

export function Badge({ variant = 'default', children, dot, className, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium ring-1 ring-inset rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[variant])} />
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
