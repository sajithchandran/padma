'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Plus, ClipboardList, TrendingUp, CheckCircle2,
  X, ChevronDown, AlertCircle, Loader2, User, Calendar, Hash,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pathway {
  id: string;
  name: string;
  code: string;
  category: string;
  status: string;
  defaultDurationDays: number;
  stages: { id: string; name: string; stageType: string }[];
  careTeamId?: string | null;
  careTeam?: {
    id: string;
    name: string;
    description?: string | null;
    _count?: { members: number };
  } | null;
}

interface Enrollment {
  id: string;
  patientId: string;
  patientDisplayName?: string;
  patientMrn?: string;
  status: string;
  enrollmentDate: string;
  createdAt: string;
  adherencePercent?: number;
  totalTasks: number;
  completedTasks: number;
  pathway: { id: string; name: string; category: string };
  currentStage: { id: string; name: string; stageType: string };
}

interface EnrollmentMeta { total: number; page: number; limit: number; totalPages: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    diabetes: 'bg-blue-100 text-blue-700',
    hypertension: 'bg-red-100 text-red-700',
    cardiac: 'bg-rose-100 text-rose-700',
    respiratory: 'bg-sky-100 text-sky-700',
    wellness: 'bg-emerald-100 text-emerald-700',
  };
  return map[cat] ?? 'bg-slate-100 text-slate-600';
}

function stageTypeBadge(type: string) {
  if (type === 'entry') return 'bg-blue-100 text-blue-700';
  if (type === 'terminal') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-600';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Enroll Form Modal ────────────────────────────────────────────────────────

const BLANK = {
  patientDisplayName: '',
  patientMrn: '',
  patientGender: '',
  patientDob: '',
  pathwayId: '',
  startDate: '',
  notes: '',
};

function EnrollModal({
  pathways,
  pathwaysLoading,
  pathwaysError,
  onClose,
  onSuccess,
}: {
  pathways: Pathway[];
  pathwaysLoading: boolean;
  pathwaysError: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof BLANK, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const selectedPathway = pathways.find((p) => p.id === form.pathwayId);
  const activePathways = pathways.filter((pathway) => pathway.status === 'active');
  const isValid = form.patientDisplayName.trim() && form.pathwayId && selectedPathway?.status === 'active';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
      // Generate a stable UUID for this patient (no patient registry in MVP)
      const patientId = crypto.randomUUID();
      await api.post(`/patients/${patientId}/enroll`, {
        pathwayId: form.pathwayId,
        patientId,
        patientDisplayName: form.patientDisplayName.trim() || undefined,
        patientMrn: form.patientMrn.trim() || undefined,
        patientGender: form.patientGender || undefined,
        patientDob: form.patientDob || undefined,
        startDate: form.startDate || undefined,
        notes: form.notes.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Enrollment failed. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Enroll Patient</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add a patient to a clinical pathway</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Patient Details section */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Patient Details
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.patientDisplayName}
                    onChange={(e) => set('patientDisplayName', e.target.value)}
                    placeholder="e.g. Ahmed Al Mansouri"
                    required
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      <Hash className="inline h-3 w-3 mr-1" />MRN
                    </label>
                    <input
                      value={form.patientMrn}
                      onChange={(e) => set('patientMrn', e.target.value)}
                      placeholder="e.g. MRN-00123"
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Gender</label>
                    <select
                      value={form.patientGender}
                      onChange={(e) => set('patientGender', e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                    >
                      <option value="">Select…</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    <Calendar className="inline h-3 w-3 mr-1" />Date of Birth
                  </label>
                  <input
                    type="date"
                    value={form.patientDob}
                    onChange={(e) => set('patientDob', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Pathway section */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5" /> Clinical Pathway
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Pathway <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.pathwayId}
                    onChange={(e) => set('pathwayId', e.target.value)}
                    required
                    disabled={pathwaysLoading || Boolean(pathwaysError)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                  >
                    <option value="">
                      {pathwaysLoading ? 'Loading pathways…' : 'Select a pathway…'}
                    </option>
                    {pathways.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.status !== 'active'}>
                        {p.name} ({p.defaultDurationDays}d){p.status !== 'active' ? ` - ${p.status}, publish first` : ''}
                      </option>
                    ))}
                  </select>
                  {pathwaysError && (
                    <p className="mt-2 text-xs text-red-600">{pathwaysError}</p>
                  )}
                  {!pathwaysLoading && !pathwaysError && activePathways.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No active pathways are available for enrollment. Publish a pathway before enrolling a patient.
                    </p>
                  )}
                  {selectedPathway && (
                    <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(selectedPathway.category)}`}>
                          {selectedPathway.category}
                        </span>
                        <span>{selectedPathway.defaultDurationDays} days duration</span>
                      </div>
                      <p className="text-blue-600">{selectedPathway.stages.length} stages · starts at "{selectedPathway.stages.find(s => s.stageType === 'entry')?.name ?? selectedPathway.stages[0]?.name}"</p>
                      {selectedPathway.status !== 'active' && (
                        <p className="text-amber-700">
                          This pathway is {selectedPathway.status}. It must be published before enrollment.
                        </p>
                      )}
                      {selectedPathway.careTeam ? (
                        <p className="text-blue-600">
                          Default care team: <span className="font-semibold">{selectedPathway.careTeam.name}</span>
                          {' '}({selectedPathway.careTeam._count?.members ?? 0} members)
                        </p>
                      ) : (
                        <p className="text-amber-700">
                          No default care team mapped to this pathway.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    <Calendar className="inline h-3 w-3 mr-1" />Start Date
                    <span className="text-slate-400 font-normal ml-1">(defaults to today)</span>
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set('startDate', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Clinical context, reason for enrollment…"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || saving}
              className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Enrolling…' : 'Enroll Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EnrollmentPage() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal]       = useState(false);
  const [refreshKey, setRefreshKey]     = useState(0);

  const [enrollments, setEnrollments]   = useState<Enrollment[]>([]);
  const [meta, setMeta]                 = useState<EnrollmentMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [pathways, setPathways]         = useState<Pathway[]>([]);
  const [pathwaysLoading, setPathwaysLoading] = useState(true);
  const [pathwaysError, setPathwaysError] = useState<string | null>(null);
  const [loadingList, setLoadingList]   = useState(true);
  const [listError, setListError]       = useState<string | null>(null);

  // Load pathways once for the form dropdown. Drafts are shown but disabled,
  // so users can see why a pathway cannot be selected for enrollment yet.
  useEffect(() => {
    let cancelled = false;

    setPathwaysLoading(true);
    setPathwaysError(null);

    api.get('/pathways', { params: { limit: 100, sortBy: 'name', sortOrder: 'asc' } })
      .then((r) => {
        if (!cancelled) setPathways(r.data.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err?.response?.data?.message;
          setPathwaysError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load pathways.'));
        }
      })
      .finally(() => {
        if (!cancelled) setPathwaysLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Fetch enrollments whenever status filter or refreshKey changes.
  // Use a cancellation flag so strict-mode's simulated unmount/remount
  // doesn't apply a stale first-fetch result to the re-mounted component.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingList(true);
      setListError(null);
      try {
        const params: Record<string, string | number> = { page: 1, limit: 50 };
        if (statusFilter !== 'ALL') params.status = statusFilter.toLowerCase();
        const r = await api.get('/enrollments', { params });
        if (!cancelled) {
          setEnrollments(r.data.data ?? []);
          setMeta(r.data.meta);
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.response?.data?.message;
          setListError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load enrollments.'));
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [statusFilter, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enrollments.filter((e) =>
      !q ||
      e.patientDisplayName?.toLowerCase().includes(q) ||
      e.patientMrn?.toLowerCase().includes(q) ||
      e.pathway?.name?.toLowerCase().includes(q),
    );
  }, [enrollments, search]);

  const stats = {
    total:     meta.total,
    active:    enrollments.filter((e) => e.status === 'active').length,
    completed: enrollments.filter((e) => e.status === 'completed').length,
  };

  return (
    <>
      <div className="space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Enrollments', value: stats.total, icon: <ClipboardList className="h-5 w-5 text-blue-500" />, bg: 'bg-blue-50' },
            { label: 'Active', value: stats.active, icon: <TrendingUp className="h-5 w-5 text-emerald-500" />, bg: 'bg-emerald-50' },
            { label: 'Completed', value: stats.completed, icon: <CheckCircle2 className="h-5 w-5 text-violet-500" />, bg: 'bg-violet-50' },
            { label: 'Active Pathways', value: pathways.filter((p) => p.status === 'active').length, icon: <ClipboardList className="h-5 w-5 text-amber-500" />, bg: 'bg-amber-50' },
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
                <Input
                  placeholder="Search by name, MRN or pathway…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                  {['ALL', 'PENDING', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED'].map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {s === 'ALL' ? 'All' : s === 'PENDING' ? 'Not Started' : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>
                  Enroll Patient
                </Button>
              </div>
            </div>

            {/* Table */}
            <Card padding="none" className="overflow-hidden">
              {listError ? (
                <div className="py-12 text-center">
                  <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-red-600">{listError}</p>
                  <button onClick={refresh} className="mt-3 text-xs text-blue-600 hover:underline">Retry</button>
                </div>
              ) : loadingList ? (
                <div className="py-16 flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading enrollments…</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['Patient', 'Pathway', 'Stage', 'Status', 'Enrolled', 'Progress'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map((e) => {
                        const progress = e.totalTasks > 0
                          ? Math.round((e.completedTasks / e.totalTasks) * 100)
                          : 0;
                        return (
                          <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar name={e.patientDisplayName ?? 'Unknown'} size="sm" />
                                <div>
                                  <p className="font-medium text-slate-900">{e.patientDisplayName ?? '—'}</p>
                                  <p className="text-xs text-slate-400">{e.patientMrn ?? 'No MRN'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="text-slate-700 max-w-[140px] truncate">{e.pathway?.name}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColor(e.pathway?.category)}`}>
                                {e.pathway?.category}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageTypeBadge(e.currentStage?.stageType)}`}>
                                {e.currentStage?.name ?? '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusBadge status={e.status.toUpperCase()} />
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                              {fmtDate(e.enrollmentDate ?? e.createdAt)}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="w-24">
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                  <span>{e.completedTasks}/{e.totalTasks} tasks</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-blue-500 transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length === 0 && !loadingList && (
                    <div className="py-16 text-center">
                      <ClipboardList className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-500">No enrollments found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {search ? 'Try a different search term' : 'Click "Enroll Patient" to get started'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Available Pathways */}
            <Card>
              <CardHeader>
                <CardTitle>Available Pathways</CardTitle>
                <CardSubtitle>Active clinical protocols</CardSubtitle>
              </CardHeader>
              <div className="space-y-2">
                {pathways.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setShowModal(true)}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">{p.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryColor(p.category)}`}>
                        {p.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.stages.length} stages · {p.defaultDurationDays} days · {p.status}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.careTeam ? `Default team: ${p.careTeam.name}` : 'No default care team'}
                    </p>
                  </button>
                ))}
                {pathwaysLoading && (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading pathways…
                  </div>
                )}
                {!pathwaysLoading && pathwaysError && (
                  <p className="text-xs text-red-500 text-center py-4">{pathwaysError}</p>
                )}
                {!pathwaysLoading && !pathwaysError && pathways.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No pathways available</p>
                )}
              </div>
            </Card>

          </div>
        </div>
      </div>

      {/* Enroll modal */}
      {showModal && (
        <EnrollModal
          pathways={pathways}
          pathwaysLoading={pathwaysLoading}
          pathwaysError={pathwaysError}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            refresh();
          }}
        />
      )}
    </>
  );
}
