'use client';

import { BarChart2, TrendingUp, Users, CheckSquare, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';

function BarChartSVG({ data, maxVal = 100 }: { data: { label: string; value: number; color?: string }[]; maxVal?: number }) {
  const h = 100;
  const w = 40;
  const gap = 12;
  const total = data.length * (w + gap);
  return (
    <svg width="100%" viewBox={`0 0 ${total} ${h + 24}`} className="overflow-visible">
      {[0, 50, 100].map((v) => (
        <line key={v} x1="0" y1={h - (v / maxVal) * h} x2={total} y2={h - (v / maxVal) * h}
          stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
      ))}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * h;
        const x = i * (w + gap);
        return (
          <g key={d.label}>
            <rect x={x} y={h - barH} width={w} height={barH} fill={d.color ?? '#3b82f6'} rx="4" opacity="0.85">
              <title>{d.label}: {d.value}</title>
            </rect>
            <text x={x + w / 2} y={h + 14} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.label}</text>
            <text x={x + w / 2} y={h - barH - 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="#475569">{d.value}</text>
          </g>
        );
      })}
    </svg>
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
  { name: 'Diabetes', patients: 412, active: 180, completed: 145, rate: 89 },
  { name: 'COPD', patients: 198, active: 88, completed: 62, rate: 76 },
  { name: 'CKD', patients: 156, active: 72, completed: 48, rate: 82 },
  { name: 'Cardiac', patients: 203, active: 94, completed: 71, rate: 91 },
  { name: 'Hypertension', patients: 278, active: 130, completed: 98, rate: 85 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Task Completion Rate', value: '87%', change: '+3.2%', icon: <CheckSquare className="h-5 w-5 text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Avg Pathway Duration', value: '74 days', change: '-6 days', icon: <Activity className="h-5 w-5 text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Patient Engagement', value: '91%', change: '+1.8%', icon: <Users className="h-5 w-5 text-violet-500" />, bg: 'bg-violet-50' },
          { label: 'Readmission Rate', value: '4.2%', change: '-0.8%', icon: <TrendingUp className="h-5 w-5 text-amber-500" />, bg: 'bg-amber-50' },
        ].map((kpi) => (
          <Card key={kpi.label} padding="md">
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.bg}`}>{kpi.icon}</div>
              <div>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{kpi.value}</p>
                <p className={`text-xs mt-0.5 font-medium ${kpi.change.startsWith('-') && kpi.label !== 'Readmission Rate' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {kpi.change} vs last month
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader action={<Badge variant="info">This week</Badge>}>
            <CardTitle>Daily Task Completion Rate</CardTitle>
            <CardSubtitle>Percentage of tasks completed each day</CardSubtitle>
          </CardHeader>
          <BarChartSVG data={TASK_COMPLETION.map((d) => ({ ...d, color: d.value >= 90 ? '#10b981' : d.value >= 70 ? '#3b82f6' : '#f59e0b' }))} />
        </Card>

        <Card>
          <CardHeader action={<Badge variant="info">Last 6 months</Badge>}>
            <CardTitle>Monthly New Enrollments</CardTitle>
            <CardSubtitle>Patients newly enrolled in care pathways</CardSubtitle>
          </CardHeader>
          <BarChartSVG data={ENROLLMENTS_MONTHLY} maxVal={80} />
        </Card>
      </div>

      {/* Condition performance table */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <CardTitle>Performance by Condition</CardTitle>
          <CardSubtitle>Pathway outcomes broken down by primary diagnosis category</CardSubtitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Condition', 'Total Patients', 'Active Pathways', 'Completed', 'Completion Rate', 'Trend'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {CONDITION_DATA.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">{row.name}</td>
                  <td className="px-6 py-4 text-slate-700">{row.patients.toLocaleString()}</td>
                  <td className="px-6 py-4 text-blue-600 font-medium">{row.active}</td>
                  <td className="px-6 py-4 text-emerald-600 font-medium">{row.completed}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-[80px]">
                        <Progress value={row.rate} size="xs" color={row.rate >= 90 ? 'emerald' : row.rate >= 80 ? 'blue' : 'amber'} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">{row.rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-emerald-600 text-xs font-medium">↑ +{Math.floor(Math.random() * 5) + 1}%</span>
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
