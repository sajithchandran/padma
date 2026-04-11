'use client';

import { 
  BarChart2, TrendingUp, Users, CheckSquare, Activity,
  Calendar, ArrowUpRight, ArrowDownRight, Target,
  Zap, ChevronRight, MoreHorizontal
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function BarChartSVG({ data, maxVal = 100 }: { data: { label: string; value: number; color?: string }[]; maxVal?: number }) {
  const h = 100;
  const w = 40;
  const gap = 12;
  const total = data.length * (w + gap);
  
  return (
    <div className="w-full overflow-hidden">
      <svg width="100%" viewBox={`0 0 ${total} ${h + 24}`} className="overflow-visible">
        {/* Grid Lines */}
        {[0, 50, 100].map((v) => (
          <line 
            key={v} 
            x1="0" 
            y1={h - (v / maxVal) * h} 
            x2={total} 
            y2={h - (v / maxVal) * h}
            className="stroke-border/30"
            strokeWidth="1" 
            strokeDasharray="4 3" 
          />
        ))}
        
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * h;
          const x = i * (w + gap);
          return (
            <g key={d.label} className="group/bar">
              <motion.rect 
                initial={{ height: 0, y: h }}
                animate={{ height: barH, y: h - barH }}
                transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                x={x} 
                width={w} 
                fill={d.color ?? 'url(#barGradient)'} 
                rx="6" 
                className="opacity-80 group-hover/bar:opacity-100 transition-opacity"
              >
                <title>{d.label}: {d.value}</title>
              </motion.rect>
              <text 
                x={x + w / 2} 
                y={h + 16} 
                textAnchor="middle" 
                className="text-[10px] font-bold fill-muted-foreground uppercase tracking-widest opacity-60"
              >
                {d.label}
              </text>
              <text 
                x={x + w / 2} 
                y={h - barH - 6} 
                textAnchor="middle" 
                className="text-[10px] font-black fill-foreground group-hover/bar:fill-primary transition-colors"
              >
                {d.value}
              </text>
            </g>
          );
        })}
        
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

const TASK_COMPLETION = [
  { label: 'Mon', value: 82 }, { label: 'Tue', value: 91 }, { label: 'Wed', value: 76 },
  { label: 'Thu', value: 88 }, { label: 'Fri', value: 95 }, { label: 'Sat', value: 60 }, { label: 'Sun', value: 42 },
];

const ENROLLMENTS_MONTHLY = [
  { label: 'Oct', value: 38, color: '#6366f1' }, { label: 'Nov', value: 44, color: '#6366f1' },
  { label: 'Dec', value: 41, color: '#6366f1' }, { label: 'Jan', value: 52, color: '#3b82f6' },
  { label: 'Feb', value: 58, color: '#3b82f6' }, { label: 'Mar', value: 63, color: '#10b981' },
];

const CONDITION_DATA = [
  { name: 'Diabetes Management', patients: 412, active: 180, completed: 145, rate: 89, trend: '+4%' },
  { name: 'COPD Monitoring', patients: 198, active: 88, completed: 62, rate: 76, trend: '+2%' },
  { name: 'CKD Care Path', patients: 156, active: 72, completed: 48, rate: 82, trend: '+3%' },
  { name: 'Cardiac Rehab', patients: 203, active: 94, completed: 71, rate: 91, trend: '+5%' },
  { name: 'Post-Surgical Control', patients: 278, active: 130, completed: 98, rate: 85, trend: '+1%' },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 pb-10">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'Completion Rate', value: '87%', change: '+3.2%', icon: <CheckSquare className="h-5 w-5 text-emerald-500" />, bg: 'bg-emerald-500/10' },
          { label: 'Care Efficiency', value: '74d', change: '-6d', icon: <Activity className="h-5 w-5 text-blue-500" />, bg: 'bg-blue-500/10' },
          { label: 'Patient Trust', value: '91%', change: '+1.8%', icon: <Users className="h-5 w-5 text-violet-500" />, bg: 'bg-violet-500/10' },
          { label: 'Readmission Risk', value: '4.2%', change: '-0.8%', icon: <Target className="h-5 w-5 text-amber-500" />, bg: 'bg-amber-500/10' },
        ].map((kpi, i) => (
          <motion.div 
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card padding="md" hover className="border-border/60">
              <div className="flex items-start justify-between">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110", kpi.bg)}>
                  {kpi.icon}
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border",
                  kpi.change.startsWith('+') ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                )}>
                  {kpi.change.startsWith('+') ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{kpi.label}</p>
                <p className="text-3xl font-black text-foreground font-display tracking-tight mt-1">{kpi.value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-border/60">
          <CardHeader action={<Badge variant="info" size="xs">Live Cycle</Badge>}>
            <CardTitle>Internal Performance Flow</CardTitle>
            <CardSubtitle>Daily objective completion rate across all active care paths</CardSubtitle>
          </CardHeader>
          <div className="mt-6 pt-6 border-t border-border/40">
            <BarChartSVG data={TASK_COMPLETION.map((d) => ({ ...d, color: d.value >= 90 ? '#10b981' : d.value >= 70 ? '#3b82f6' : '#f59e0b' }))} />
          </div>
        </Card>

        <Card className="border-border/60">
          <CardHeader action={<Badge variant="info" size="xs">Rolling 6M</Badge>}>
            <CardTitle>Growth & Population</CardTitle>
            <CardSubtitle>New clinical enrollments systematically onboarded over time</CardSubtitle>
          </CardHeader>
          <div className="mt-6 pt-6 border-t border-border/40">
            <BarChartSVG data={ENROLLMENTS_MONTHLY} maxVal={80} />
          </div>
        </Card>
      </div>

      {/* Condition performance table */}
      <Card padding="none" className="overflow-hidden border-border/60">
        <div className="px-6 py-5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <CardTitle>Efficacy by Clinical Condition</CardTitle>
            <CardSubtitle>Comparative outcomes across primary diagnostic categories</CardSubtitle>
          </div>
          <Button variant="ghost" size="xs" iconRight={<ChevronRight className="h-3 w-3" />}>Export Report</Button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                {['Diagnosis Group', 'Total Pop', 'Active Path', 'Closed Cases', 'Success Rate', 'Trend'].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {CONDITION_DATA.map((row) => (
                <tr key={row.name} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-6 py-4">
                     <p className="text-sm font-bold text-foreground font-display">{row.name}</p>
                  </td>
                  <td className="px-6 py-4">
                     <p className="text-xs font-bold text-muted-foreground">{row.patients.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                     <Badge variant="in_progress" size="xs">{row.active}</Badge>
                  </td>
                  <td className="px-6 py-4">
                     <Badge variant="completed" size="xs">{row.completed}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-[100px]">
                        <Progress value={row.rate} size="xs" color={row.rate >= 90 ? 'emerald' : row.rate >= 80 ? 'blue' : 'amber'} />
                      </div>
                      <span className="text-[11px] font-black text-foreground w-8">{row.rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                       <ArrowUpRight className="h-3 w-3" /> {row.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border bg-muted/20 text-right">
           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aggregate Clinical Success: 84.6%</span>
        </div>
      </Card>
    </div>
  );
}
