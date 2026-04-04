import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fill = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    + ` L ${pts[pts.length - 1].x} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} className="opacity-60">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sg)" />
      <path d={path} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCard({ title, value, change, changeLabel, icon, iconBg = 'bg-blue-50', suffix, className, sparkline }: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1.5 text-3xl font-bold text-slate-900 tracking-tight">
            {value}{suffix && <span className="text-lg font-semibold text-slate-500 ml-0.5">{suffix}</span>}
          </p>
        </div>
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {change !== undefined && (
          <div className={cn(
            'inline-flex items-center gap-1 text-sm font-medium',
            isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-slate-500',
          )}>
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : isNegative ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {Math.abs(change)}% {changeLabel ?? 'vs last month'}
          </div>
        )}
        {sparkline && <Sparkline data={sparkline} />}
      </div>
    </div>
  );
}
