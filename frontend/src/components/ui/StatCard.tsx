import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBg?: string;
  suffix?: string;
  className?: string;
  sparkline?: number[];
}

function Sparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 40;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fill = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    + ` L ${pts[pts.length - 1].x} ${h} L 0 ${h} Z`;

  return (
    <div className="relative group/spark">
      <svg width={w} height={h} className="opacity-80 transition-opacity group-hover/spark:opacity-100 overflow-visible">
        <defs>
          <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          d={path} 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path d={fill} fill={`url(#sg-${color})`} />
      </svg>
    </div>
  );
}

export function StatCard({ title, value, change, changeLabel, icon, iconBg, suffix, className, sparkline }: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  
  const accentColor = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#3b82f6';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative overflow-hidden group',
        'bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4',
        'hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300',
        className
      )}
    >
      {/* Decorative background glow */}
      <div className={cn(
        "absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-[0.03] dark:opacity-[0.07] transition-opacity group-hover:opacity-20 rounded-full",
        iconBg?.replace('bg-', 'bg-').replace('-50', '-500') || 'bg-primary'
      )} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-display">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground tracking-tight font-display">
            {value}
            {suffix && <span className="text-lg font-medium text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
        <div className={cn(
          'h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-300',
          iconBg || 'bg-primary/10 text-primary'
        )}>
          {icon}
        </div>
      </div>

      <div className="flex items-end justify-between mt-auto">
        <div className="space-y-1">
          {change !== undefined && (
            <div className={cn(
              'inline-flex items-center gap-1 text-sm font-semibold',
              isPositive ? 'text-emerald-600 dark:text-emerald-400' : isNegative ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground',
            )}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : isNegative ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              {Math.abs(change)}%
            </div>
          )}
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
            {changeLabel ?? 'vs last month'}
          </p>
        </div>
        
        {sparkline && (
          <div className="flex-shrink-0">
            <Sparkline data={sparkline} color={accentColor} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
