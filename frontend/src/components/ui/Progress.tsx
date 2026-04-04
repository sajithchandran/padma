import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  label?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'red' | 'violet';
}

const colors = {
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  violet:  'bg-violet-500',
};

function getAutoColor(value: number) {
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 50) return 'bg-blue-500';
  if (value >= 30) return 'bg-amber-500';
  return 'bg-red-500';
}

const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5' };

export function Progress({ value, className, barClassName, size = 'sm', showLabel, label, color }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const barColor = color ? colors[color] : getAutoColor(clamped);

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-slate-500">{label}</span>
          {showLabel && <span className="text-xs font-medium text-slate-700">{clamped}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-slate-100 rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor, barClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
