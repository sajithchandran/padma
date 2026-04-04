'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, ClipboardList, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, RiskBadge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { MOCK_ENROLLMENTS } from '@/lib/mock-data';

export default function EnrollmentPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const stats = {
    total: MOCK_ENROLLMENTS.length,
    active: MOCK_ENROLLMENTS.filter((e) => e.status === 'ACTIVE').length,
    completed: MOCK_ENROLLMENTS.filter((e) => e.status === 'COMPLETED').length,
    pending: MOCK_ENROLLMENTS.filter((e) => e.status === 'PENDING').length,
    rate: Math.round((MOCK_ENROLLMENTS.filter((e) => e.status === 'ACTIVE').length / MOCK_ENROLLMENTS.length) * 100),
  };

  const filtered = useMemo(() =>
    MOCK_ENROLLMENTS.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.patientName.toLowerCase().includes(q) || e.pathwayName.toLowerCase().includes(q) || e.patientMrn.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
      return matchSearch && matchStatus;
    }), [search, statusFilter]);

  const riskDist = MOCK_ENROLLMENTS.reduce((acc, e) => {
    acc[e.riskLevel] = (acc[e.riskLevel] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Enrollments', value: stats.total, icon: <ClipboardList className="h-5 w-5 text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Active', value: stats.active, icon: <TrendingUp className="h-5 w-5 text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle2 className="h-5 w-5 text-violet-500" />, bg: 'bg-violet-50' },
          { label: 'Enrollment Rate', value: `${stats.rate}%`, icon: <TrendingUp className="h-5 w-5 text-amber-500" />, bg: 'bg-amber-50' },
        ].map((s) => (
          <Card key={s.label} padding="sm">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input placeholder="Search enrollments…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
            </div>
            <div className="flex gap-2">
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                {['ALL', 'ACTIVE', 'COMPLETED', 'PENDING'].map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <Button icon={<Plus className="h-4 w-4" />}>Enroll Patient</Button>
            </div>
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Patient', 'Pathway', 'Risk', 'Status', 'Enrolled', 'Enrolled By'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={e.patientName} size="sm" />
                          <div>
                            <p className="font-medium text-slate-900">{e.patientName}</p>
                            <p className="text-xs text-slate-400">{e.patientMrn}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 max-w-[150px]">
                        <p className="truncate">{e.pathwayName}</p>
                      </td>
                      <td className="px-4 py-3.5"><RiskBadge level={e.riskLevel} /></td>
                      <td className="px-4 py-3.5"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{e.enrolledAt}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={e.enrolledBy} size="xs" />
                          <span className="text-xs text-slate-600 whitespace-nowrap">{e.enrolledBy}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-400">No enrollments found.</div>
              )}
            </div>
          </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Risk distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
              <CardSubtitle>Enrolled patients by risk level</CardSubtitle>
            </CardHeader>
            <div className="space-y-3">
              {[
                { level: 'CRITICAL', color: 'bg-red-500' },
                { level: 'HIGH',     color: 'bg-orange-500' },
                { level: 'MEDIUM',   color: 'bg-amber-500' },
                { level: 'LOW',      color: 'bg-emerald-500' },
              ].map(({ level, color }) => {
                const count = riskDist[level] ?? 0;
                const pct = Math.round((count / MOCK_ENROLLMENTS.length) * 100);
                return (
                  <div key={level}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">{level}</span>
                      <span className="text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent completions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Completions</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {MOCK_ENROLLMENTS.filter((e) => e.status === 'COMPLETED').map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">{e.patientName}</p>
                    <p className="text-xs text-slate-400 truncate">{e.pathwayName}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 flex-shrink-0">{e.completedAt}</p>
                </div>
              ))}
              {MOCK_ENROLLMENTS.filter((e) => e.status === 'COMPLETED').length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No completions yet</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
