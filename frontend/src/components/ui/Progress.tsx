import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  color?: 'primary' | 'blue' | 'emerald' | 'amber' | 'red' | 'indigo' | 'amethyst' | 'violet';
}

const colors = {
  primary: 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]',
  blue:    'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]',
  emerald: 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]',
  amber:   'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]',
  red:     'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]',
  indigo:  'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.3)]',
  amethyst: 'bg-amethyst-500 shadow-[0_0_8px_rgba(217,70,239,0.3)]',
  violet:  'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]',
};

function getAutoColor(value: number) {
  if (value >= 80) return colors.emerald;
  if (value >= 50) return colors.primary;
  if (value >= 30) return colors.amber;
  return colors.red;
}

const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

export function Progress({ value, className, barClassName, size = 'sm', showLabel, label, color }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const barColor = color ? colors[color] : getAutoColor(clamped);

  return (
    <div className={cn('w-full space-y-2', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-end">
          {label && <span className="text-xs font-bold text-foreground/80 uppercase tracking-wider font-display">{label}</span>}
          {showLabel && <span className="text-xs font-bold text-foreground font-display tracking-tight">{clamped}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden border border-border/50', heights[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn('h-full rounded-full transition-all relative overflow-hidden', barColor, barClassName)}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        </motion.div>
      </div>
    </div>
  );
}
