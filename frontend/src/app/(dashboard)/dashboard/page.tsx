'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users, Route, CheckSquare, ClipboardList,
  TrendingUp, AlertTriangle, Clock, ArrowRight,
  Activity, CalendarClock,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
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
  const chartH = 120;
  const barW = 8;
  const groupW = 52;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${data.length * groupW + 20} ${chartH + 28}`} className="overflow-visible">
        {/* Y grid */}
        {[0, 25, 50].map((v) => (
          <line key={v} x1="0" y1={chartH - (v / maxVal) * chartH} x2={data.length * groupW} y2={chartH - (v / maxVal) * chartH}
            stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
        ))}
        {data.map((d, gi) => (
          <g key={d.label} transform={`translate(${gi * groupW + 10}, 0)`}>
            {categories.map((cat, ci) => {
              const val = (d as any)[cat.key];
              const barH = (val / maxVal) * chartH;
              return (
                <rect key={cat.key}
                  x={ci * (barW + 2)} y={chartH - barH} width={barW} height={barH}
                  fill={cat.color} rx="2" opacity="0.85"
                >
                  <title>{cat.label}: {val}</title>
                </rect>
              );
            })}
            <text x={categories.length * (barW + 2) / 2} y={chartH + 16} textAnchor="middle"
              fontSize="10" fill="#94a3b8">{d.label}</text>
          </g>
        ))}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 flex-wrap">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: cat.color }} />
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
  const r = 42;
  const cx = 56;
  const cy = 56;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width={cx * 2} height={cy * 2}>
          {segments.map((seg, i) => {
            const dashArray = (seg.pct / 100) * circumference;
            const dashOffset = -cumulative * circumference / 100;
            cumulative += seg.pct;
            return (
              <circle key={seg.label}
                cx={cx} cy={cy} r={r}
                fill="none" stroke={seg.color} strokeWidth="12"
                strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                strokeDashoffset={dashOffset}
                style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
              />
            );
          })}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">{total}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#94a3b8">PATHWAYS</text>
        </svg>
      </div>
      <div className="space-y-2.5 flex-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-xs text-slate-600 flex-1">{seg.label}</span>
            <span className="text-xs font-semibold text-slate-900">{seg.value}</span>
            <span className="text-xs text-slate-400 w-8 text-right">{seg.pct}%</span>
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
    <div className="space-y-6">
      {/* Alerts banner */}
      {(overdueCount > 0 || criticalPatients.length > 0) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">
            <span className="font-semibold">{overdueCount} overdue task{overdueCount !== 1 ? 's' : ''}</span> and{' '}
            <span className="font-semibold">{criticalPatients.length} critical-risk patient{criticalPatients.length !== 1 ? 's' : ''}</span> require your attention.
          </p>
          <Link href="/tasks?filter=overdue" className="text-xs font-medium text-red-700 hover:underline flex-shrink-0">
            View tasks →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients"
          value={MOCK_STATS.totalPatients.toLocaleString()}
          change={MOCK_STATS.patientsChange}
          icon={<Users className="h-6 w-6 text-blue-600" />}
          iconBg="bg-blue-50"
          sparkline={[1190, 1205, 1215, 1222, 1230, 1240, 1247]}
        />
        <StatCard
          title="Active Pathways"
          value={MOCK_STATS.activePathways}
          change={MOCK_STATS.pathwaysChange}
          icon={<Route className="h-6 w-6 text-violet-600" />}
          iconBg="bg-violet-50"
          sparkline={[340, 348, 352, 361, 368, 376, 384]}
        />
        <StatCard
          title="Tasks Due Today"
          value={MOCK_STATS.tasksDueToday}
          change={MOCK_STATS.tasksChange}
          icon={<CheckSquare className="h-6 w-6 text-amber-600" />}
          iconBg="bg-amber-50"
          sparkline={[18, 25, 21, 30, 27, 19, 23]}
        />
        <StatCard
          title="Enrollment Rate"
          value={MOCK_STATS.enrollmentRate}
          suffix="%"
          change={MOCK_STATS.enrollmentChange}
          icon={<ClipboardList className="h-6 w-6 text-emerald-600" />}
          iconBg="bg-emerald-50"
          sparkline={[71, 73, 72, 74, 75, 77, 78]}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar chart */}
        <Card className="xl:col-span-2">
          <CardHeader action={<Badge variant="info">Last 6 months</Badge>}>
            <CardTitle>Pathway Enrollments by Condition</CardTitle>
            <CardSubtitle>Monthly enrollment trends across top conditions</CardSubtitle>
          </CardHeader>
          <BarChart />
        </Card>

        {/* Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Pathway Status</CardTitle>
            <CardSubtitle>All active clinical pathways</CardSubtitle>
          </CardHeader>
          <DonutChart />
        </Card>
      </div>

      {/* Lower row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* High-risk patients */}
        <Card padding="none" className="xl:col-span-2 overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <div>
              <CardTitle>High Risk Patients</CardTitle>
              <CardSubtitle>Patients requiring immediate attention</CardSubtitle>
            </div>
            <Link href="/patients?filter=high-risk">
              <Button variant="ghost" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
                View all
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {MOCK_PATIENTS.filter((p) => ['HIGH', 'CRITICAL'].includes(p.riskLevel)).slice(0, 5).map((p) => (
              <Link key={p.id} href={`/patients/${p.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors group">
                <Avatar name={p.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">{p.name}</p>
                  <p className="text-xs text-slate-500 truncate">{p.mrn} · {p.primaryDiagnosis}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <RiskBadge level={p.riskLevel} />
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-medium text-slate-700">{p.openTasks} tasks</p>
                    <p className="text-xs text-slate-400">open</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Activity feed */}
        <Card padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <CardTitle>Recent Activity</CardTitle>
            <CardSubtitle>Latest care coordination events</CardSubtitle>
          </div>
          <div className="divide-y divide-slate-50">
            {MOCK_ACTIVITY.map((a) => (
              <div key={a.id} className="px-5 py-3 flex gap-3">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  a.type === 'alert' || a.type === 'task_overdue' ? 'bg-red-50' :
                  a.type === 'task_completed' ? 'bg-emerald-50' :
                  a.type === 'enrollment' ? 'bg-blue-50' : 'bg-violet-50'
                }`}>
                  {a.type === 'alert' || a.type === 'task_overdue'
                    ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    : a.type === 'task_completed'
                    ? <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                    : a.type === 'enrollment'
                    ? <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                    : <Route className="h-3.5 w-3.5 text-violet-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 leading-snug">{a.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{a.user} · {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Today's tasks */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <div>
            <CardTitle>Today&apos;s Tasks</CardTitle>
            <CardSubtitle>{todayTasks.length} tasks pending or in progress</CardSubtitle>
          </div>
          <Link href="/tasks">
            <Button variant="ghost" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
              All tasks
            </Button>
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {todayTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
              <StatusBadge status={task.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                <p className="text-xs text-slate-500 truncate">{task.patientName} · {task.pathwayName}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <PriorityBadge priority={task.priority} />
                <div className="flex items-center gap-1.5 text-xs text-slate-400 hidden sm:flex">
                  <Clock className="h-3.5 w-3.5" />
                  {task.dueDate}
                </div>
                {task.assignedTo && (
                  <Avatar name={task.assignedTo} size="xs" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
