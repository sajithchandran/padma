'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RiskBadge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { MOCK_PATIENTS } from '@/lib/mock-data';
import type { Patient, RiskLevel } from '@/types';

type SortKey = 'name' | 'riskLevel' | 'openTasks' | 'lastVisit';

const RISK_ORDER: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('riskLevel');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    let list = MOCK_PATIENTS.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q) || p.primaryDiagnosis.toLowerCase().includes(q);
      const matchRisk = riskFilter === 'ALL' || p.riskLevel === riskFilter;
      return matchSearch && matchRisk;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'riskLevel') cmp = RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
      else if (sortKey === 'openTasks') cmp = a.openTasks - b.openTasks;
      else if (sortKey === 'lastVisit') cmp = (a.lastVisit ?? '').localeCompare(b.lastVisit ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [search, riskFilter, sortKey, sortDir]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-blue-500" />
      : <ChevronDown className="h-3 w-3 text-blue-500" />;
  }

  const RISKS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const riskCounts: Record<string, number> = { ALL: MOCK_PATIENTS.length };
  MOCK_PATIENTS.forEach((p) => { riskCounts[p.riskLevel] = (riskCounts[p.riskLevel] ?? 0) + 1; });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by name, MRN or diagnosis…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Button variant="outline" icon={<SlidersHorizontal className="h-4 w-4" />}>Filters</Button>
        <Button icon={<Plus className="h-4 w-4" />}>New Patient</Button>
      </div>

      {/* Risk tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {RISKS.map((r) => (
          <button
            key={r}
            onClick={() => setRiskFilter(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              riskFilter === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {r} <span className="text-slate-400">({riskCounts[r] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[
                  { label: 'Patient', key: 'name' },
                  { label: 'Risk', key: 'riskLevel' },
                  { label: 'Diagnosis', key: null },
                  { label: 'Coordinator', key: null },
                  { label: 'Open Tasks', key: 'openTasks' },
                  { label: 'Last Visit', key: 'lastVisit' },
                  { label: 'Next Appt', key: null },
                  { label: '', key: null },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${key ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}
                    onClick={() => key && toggleSort(key as SortKey)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {key && <SortIcon col={key as SortKey} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} size="sm" />
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.mrn}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><RiskBadge level={p.riskLevel} /></td>
                  <td className="px-4 py-3.5 max-w-[180px]">
                    <p className="text-slate-700 truncate">{p.primaryDiagnosis}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    {p.assignedCareCoordinator ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={p.assignedCareCoordinator} size="xs" />
                        <span className="text-slate-600 text-xs whitespace-nowrap">{p.assignedCareCoordinator}</span>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`font-semibold ${p.openTasks > 4 ? 'text-red-600' : p.openTasks > 1 ? 'text-amber-600' : 'text-slate-700'}`}>
                      {p.openTasks}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{p.lastVisit ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{p.nextAppointment ?? '—'}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/patients/${p.id}`}>
                      <Button variant="ghost" size="xs">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-500">No patients match your search.</p>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
          <span>Showing {filtered.length} of {MOCK_PATIENTS.length} patients</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="xs" disabled>Previous</Button>
            <Button variant="outline" size="xs" disabled>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
