'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Users, Route, CheckSquare, ClipboardList,
  AlertTriangle, Clock, ArrowRight,
  TrendingUp, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from '@/components/ui/Card';
import { Badge, RiskBadge, StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import {
  MOCK_STATS, MOCK_PATIENTS, MOCK_TASKS, MOCK_PATHWAYS, MOCK_ACTIVITY,
} from '@/lib/mock-data';

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart() {
  const data = [
    { label: 'Oct', diabetes: 28, copd: 14, ckd: 9, cardiac: 7 },
    { label: 'Nov', diabetes: 32, copd: 18, ckd: 12, cardiac: 9 },
    { label: 'Dec', diabetes: 31, copd: 20, ckd: 13, cardiac: 11 },
    { label: 'Jan', diabetes: 38, copd: 22, ckd: 15, cardiac: 13 },
    { label: 'Feb', diabetes: 40, copd: 25, ckd: 18, cardiac: 16 },
    { label: 'Mar', diabetes: 44, copd: 27, ckd: 19, cardiac: 18 },
  ];
  const categories = [
    { key: 'diabetes', color: '#3b82f6', label: 'Diabetes' },
    { key: 'copd',     color: '#10b981', label: 'COPD' },
    { key: 'ckd',      color: '#f59e0b', label: 'CKD' },
    { key: 'cardiac',  color: '#8b5cf6', label: 'Cardiac' },
  ];
  const maxVal = 50;
  const chartH = 140;
  const barW = 10;
  const groupSpace = 24;
  const groupW = categories.length * (barW + 2) + groupSpace;

  return (
    <div className="w-full">
      <svg width="100%" viewBox={`0 0 ${data.length * groupW + 20} ${chartH + 40}`} className="overflow-visible">
        {/* Y grid lines */}
        {[0, 25, 50].map((v) => {
          const y = chartH - (v / maxVal) * chartH;
          return (
            <g key={v}>
              <line x1="0" y1={y} x2={data.length * groupW} y2={y}
                className="stroke-border/50" strokeWidth="1" strokeDasharray="4 4" />
              <text x="-10" y={y + 4} textAnchor="end" fontSize="10" className="fill-muted-foreground font-medium">{v}</text>
            </g>
          );
        })}
        {data.map((d, gi) => (
          <g key={d.label} transform={`translate(${gi * groupW + 20}, 0)`}>
            {categories.map((cat, ci) => {
              const val = (d as any)[cat.key];
              const barH = (val / maxVal) * chartH;
              return (
                <motion.rect 
                  key={cat.key}
                  initial={{ height: 0, y: chartH }}
                  animate={{ height: barH, y: chartH - barH }}
                  transition={{ duration: 1, delay: gi * 0.1 + ci * 0.05 }}
                  x={ci * (barW + 3)} width={barW}
                  fill={cat.color} rx="3" className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                >
                  <title>{cat.label}: {val}</title>
                </motion.rect>
              );
            })}
            <text x={categories.length * (barW + 3) / 2} y={chartH + 20} textAnchor="middle"
              className="font-bold text-[10px] fill-muted-foreground uppercase tracking-widest">{d.label}</text>
          </g>
        ))}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-6 mt-6 flex-wrap justify-center sm:justify-start">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span className="h-3 w-3 rounded-md flex-shrink-0 shadow-sm" style={{ background: cat.color }} />
            {cat.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

function DonutChart() {
  const segments = [
    { label: 'Completed', value: 156, pct: 41, color: '#10b981' },
    { label: 'In Progress', value: 142, pct: 37, color: '#3b82f6' },
    { label: 'Pending', value: 68, pct: 18, color: '#f59e0b' },
    { label: 'Overdue', value: 18, pct: 4, color: '#ef4444' },
  ];
  const total = 384;

  let cumulative = 0;
  const r = 46;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex flex-col md:flex-row items-center gap-10">
      <div className="relative flex-shrink-0 group">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-0 group-hover:opacity-40 transition-opacity rounded-full scale-150" />
        <svg width={cx * 2} height={cy * 2} className="relative z-10 rotate-[-90deg] overflow-visible">
          {segments.map((seg) => {
            const dashArray = (seg.pct / 100) * circumference;
            const dashOffset = -cumulative * circumference / 100;
            cumulative += seg.pct;
            return (
              <motion.circle 
                key={seg.label}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                cx={cx} cy={cy} r={r}
                fill="none" stroke={seg.color} strokeWidth="14"
                strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                strokeLinecap="round"
                className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
              />
            );
          })}
          {/* Inner circle for total */}
          <g transform={`rotate(90 ${cx} ${cy})`}>
            <text x={cx} y={cy - 2} textAnchor="middle" className="fill-foreground text-2xl font-black font-display tracking-tight">{total}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] font-bold uppercase tracking-widest">Active</text>
          </g>
        </svg>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 flex-1 w-full">
        {segments.map((seg) => (
          <div key={seg.label} className="group/item flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full flex-shrink-0 shadow-sm" style={{ background: seg.color }} />
              <span className="text-sm font-bold text-foreground/80 font-display">{seg.label}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-foreground block">{seg.value}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{seg.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const overdueCount = MOCK_TASKS.filter((t) => t.status === 'OVERDUE').length;
  const criticalPatients = MOCK_PATIENTS.filter((p) => p.riskLevel === 'CRITICAL');
  const todayTasks = MOCK_TASKS.filter((t) => ['PENDING', 'IN_PROGRESS', 'OVERDUE'].includes(t.status));

  return (
    <div className="space-y-8 pb-10 animate-in">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-foreground font-display tracking-tight">System Overview</h2>
          <p className="text-muted-foreground font-medium mt-1">Efficiently manage your clinical pathways and patient coordination.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<Activity className="h-4 w-4" />}>Audit Log</Button>
          <Button variant="premium" size="sm" icon={<Activity className="h-4 w-4" />}>New Patient</Button>
        </div>
      </div>

      {/* Alerts section */}
      {(overdueCount > 0 || criticalPatients.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col sm:flex-row items-center gap-4 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm shadow-sm"
        >
          <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
             <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-foreground/90 font-medium flex-1">
            <span className="font-bold text-red-600 dark:text-red-400">{overdueCount} overdue tasks</span> and{' '}
            <span className="font-bold text-red-600 dark:text-red-400">{criticalPatients.length} critical patients</span> require your immediate attention.
          </p>
          <Link href="/tasks?filter=overdue">
            <Button variant="destructive" size="sm" className="rounded-xl px-6">
              Take Action
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Primary Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Patients"
          value={MOCK_STATS.totalPatients.toLocaleString()}
          change={MOCK_STATS.patientsChange}
          icon={<Users className="h-6 w-6" />}
          iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          sparkline={[1190, 1205, 1215, 1222, 1230, 1240, 1247]}
        />
        <StatCard
          title="Active Pathways"
          value={MOCK_STATS.activePathways}
          change={MOCK_STATS.pathwaysChange}
          icon={<Route className="h-6 w-6" />}
          iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          sparkline={[340, 348, 352, 361, 368, 376, 384]}
        />
        <StatCard
          title="Tasks Due Today"
          value={MOCK_STATS.tasksDueToday}
          change={MOCK_STATS.tasksChange}
          icon={<CheckSquare className="h-6 w-6" />}
          iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          sparkline={[18, 25, 21, 30, 27, 19, 23]}
        />
        <StatCard
          title="Enrollment Rate"
          value={MOCK_STATS.enrollmentRate}
          suffix="%"
          change={MOCK_STATS.enrollmentChange}
          icon={<ClipboardList className="h-6 w-6" />}
          iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          sparkline={[71, 73, 72, 74, 75, 77, 78]}
        />
      </div>

      {/* Chart Visuals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card padding="glass" className="lg:col-span-2">
          <CardHeader action={<Badge variant="info" size="sm">Last 6 Months</Badge>}>
            <CardTitle>Enrollment Trends</CardTitle>
            <CardSubtitle>Cross-condition pathway enrollment volume</CardSubtitle>
          </CardHeader>
          <BarChart />
        </Card>

        <Card padding="glass">
          <CardHeader>
            <CardTitle>Pathway Health</CardTitle>
            <CardSubtitle>Global status distribution</CardSubtitle>
          </CardHeader>
          <DonutChart />
        </Card>
      </div>

      {/* Operational Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Risk Registry */}
        <Card padding="none" className="xl:col-span-2 overflow-hidden border-border/50">
          <div className="px-8 py-6 flex items-center justify-between bg-muted/30 border-b border-border/50">
            <div>
              <CardTitle className="text-xl">High Risk Monitor</CardTitle>
              <CardSubtitle>Critical patients prioritized by intervention requirement</CardSubtitle>
            </div>
            <Link href="/patients?filter=high-risk">
              <Button variant="ghost" size="sm" iconRight={<ArrowRight className="h-4 w-4" />} className="font-bold">
                Monitor All
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {MOCK_PATIENTS.filter((p) => ['HIGH', 'CRITICAL'].includes(p.riskLevel)).slice(0, 5).map((p, idx) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/patients/${p.id}`} className="flex items-center gap-6 px-8 py-5 hover:bg-muted/40 transition-all group">
                  <Avatar name={p.name} size="md" className="ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-foreground group-hover:text-primary transition-colors truncate font-display">{p.name}</p>
                    <p className="text-xs font-bold text-muted-foreground/70 truncate flex items-center gap-2 mt-0.5">
                      <span>{p.mrn}</span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span>{p.primaryDiagnosis}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <RiskBadge level={p.riskLevel} />
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-black text-foreground">{p.openTasks}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Open Tasks</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Activity Stream */}
        <Card padding="none" className="overflow-hidden border-border/50">
          <div className="px-6 py-6 border-b border-border/50 bg-muted/30">
            <CardTitle>Clinical Feed</CardTitle>
            <CardSubtitle>Real-time coordination stream</CardSubtitle>
          </div>
          <div className="divide-y divide-border/40 max-h-[500px] overflow-y-auto custom-scrollbar">
            {MOCK_ACTIVITY.map((a, idx) => (
              <motion.div 
                key={a.id} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="px-6 py-4 flex gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm',
                  a.type === 'alert' || a.type === 'task_overdue' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                  a.type === 'task_completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  'bg-primary/10 text-primary'
                )}>
                  {a.type === 'alert' || a.type === 'task_overdue' ? <AlertTriangle className="h-4 w-4" /> :
                   a.type === 'task_completed' ? <CheckSquare className="h-4 w-4" /> :
                   <Activity className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="text-sm font-bold text-foreground/90 leading-snug">{a.message}</p>
                  <div className="flex items-center gap-2 mt-1.5 font-bold text-[10px] text-muted-foreground/60 uppercase tracking-tighter">
                    <span>{a.user}</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/40" />
                    <span>{a.time}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Focus Area: Priority Actions */}
      <Card padding="none" className="overflow-hidden border-border/50">
        <div className="px-8 py-6 flex items-center justify-between border-b border-border/50 bg-muted/30">
          <div>
            <CardTitle className="text-xl">Action Required</CardTitle>
            <CardSubtitle>{todayTasks.length} high-priority clinical intervention tasks</CardSubtitle>
          </div>
          <Link href="/tasks">
            <Button variant="outline" size="sm" className="font-bold">Focus View</Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/10 border-b border-border/40">
                <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Clinical Task</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] hidden md:table-cell">Patient</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Priority</th>
                <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {todayTasks.slice(0, 6).map((task) => (
                <tr key={task.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-8 py-4"><StatusBadge status={task.status} /></td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors font-display">{task.title}</p>
                    <p className="text-xs font-bold text-muted-foreground mt-0.5">{task.pathwayName}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-xs font-bold text-foreground/80">{task.patientName}</span>
                  </td>
                  <td className="px-6 py-4"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-xs font-bold text-muted-foreground hidden lg:block">{task.assignedTo}</span>
                      <Avatar name={task.assignedTo || 'Unassigned'} size="xs" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
