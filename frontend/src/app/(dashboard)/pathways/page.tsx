'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, Route, CheckCircle2, PlayCircle, PauseCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { MOCK_PATHWAYS } from '@/lib/mock-data';

export default function PathwaysPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = useMemo(() =>
    MOCK_PATHWAYS.filter((pw) => {
      const q = search.toLowerCase();
      const matchSearch = !q || pw.name.toLowerCase().includes(q) || pw.patientName?.toLowerCase().includes(q) || pw.diagnosis.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || pw.status === statusFilter;
      return matchSearch && matchStatus;
    }), [search, statusFilter]);

  const stats = {
    active: MOCK_PATHWAYS.filter((p) => p.status === 'ACTIVE').length,
    completed: MOCK_PATHWAYS.filter((p) => p.status === 'COMPLETED').length,
    paused: MOCK_PATHWAYS.filter((p) => p.status === 'PAUSED').length,
    avgProgress: Math.round(MOCK_PATHWAYS.filter(p => p.status === 'ACTIVE').reduce((s, p) => s + p.progressPct, 0) / MOCK_PATHWAYS.filter(p => p.status === 'ACTIVE').length),
  };

  return (
    <div className="space-y-5">
      {/* Stat summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active', value: stats.active, icon: <PlayCircle className="h-5 w-5 text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Paused', value: stats.paused, icon: <PauseCircle className="h-5 w-5 text-amber-500" />, bg: 'bg-amber-50' },
          { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: <Route className="h-5 w-5 text-violet-500" />, bg: 'bg-violet-50' },
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Search pathways, patients, diagnoses…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
            {['ALL', 'ACTIVE', 'COMPLETED', 'PAUSED'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <Button icon={<Plus className="h-4 w-4" />}>New Pathway</Button>
        </div>
      </div>

      {/* Grid of pathway cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((pw) => (
          <Card key={pw.id} padding="none" hover className="overflow-hidden">
            {/* Status indicator bar */}
            <div className={`h-1 w-full ${pw.status === 'COMPLETED' ? 'bg-emerald-400' : pw.status === 'PAUSED' ? 'bg-amber-400' : pw.status === 'CANCELLED' ? 'bg-red-400' : 'bg-blue-500'}`} />
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="neutral" size="sm">{pw.code}</Badge>
                    <StatusBadge status={pw.status} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{pw.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{pw.description}</p>
                </div>
              </div>

              {/* Patient */}
              {pw.patientName && (
                <div className="flex items-center gap-2 mb-4">
                  <Avatar name={pw.patientName} size="xs" />
                  <div>
                    <p className="text-xs font-medium text-slate-700">{pw.patientName}</p>
                    <p className="text-[10px] text-slate-400">{pw.diagnosis}</p>
                  </div>
                </div>
              )}

              {/* Progress */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-semibold text-slate-700">{pw.completedSteps}/{pw.totalSteps} steps</span>
                </div>
                <Progress value={pw.progressPct} size="md" showLabel />
              </div>

              {/* Dates + action */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400">Started {pw.startDate}</p>
                  {pw.targetEndDate && <p className="text-[10px] text-slate-400">Target {pw.targetEndDate}</p>}
                </div>
                <Button variant="ghost" size="xs">View details</Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <Route className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No pathways match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
