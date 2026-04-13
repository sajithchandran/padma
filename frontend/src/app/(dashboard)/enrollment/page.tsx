'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Plus, ClipboardList, TrendingUp, CheckCircle2,
  X, ChevronDown, AlertCircle, Loader2, User, Calendar, Hash,
  Activity, Users, ArrowRight, Route
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

function categoryVariant(cat: string): any {
  const map: Record<string, string> = {
    diabetes: 'info',
    hypertension: 'danger',
    cardiac: 'critical',
    respiratory: 'in_progress',
    wellness: 'success',
  };
  return map[cat.toLowerCase()] ?? 'neutral';
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
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
  isLoading,
  error: pathwaysError,
  onClose,
  onSuccess,
}: {
  pathways: Pathway[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof BLANK, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const selectedPathway = pathways.find((p) => p.id === form.pathwayId);
  const activePathways = pathways.filter((p) => p.status === 'active');
  const isValid = form.patientDisplayName.trim() && form.pathwayId && selectedPathway?.status === 'active';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
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
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Process failed.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative w-full sm:max-w-xl bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] border border-border">
        <div className="px-6 py-5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">Enroll Patient</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Initialize clinical pathway adherence</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-500 rounded-xl font-bold">{error}</div>}
            
            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Clinical Identity</h3>
               <Input label="Patient Full Name" required value={form.patientDisplayName} onChange={(e) => set('patientDisplayName', e.target.value)} placeholder="e.g. John Doe" />
               <div className="grid grid-cols-2 gap-4">
                  <Input label="Gov/Registry MRN" value={form.patientMrn} onChange={(e) => set('patientMrn', e.target.value)} icon={<Hash className="h-4 w-4" />} />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Gender</label>
                    <select value={form.patientGender} onChange={(e) => set('patientGender', e.target.value)} className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold">
                       <option value="">Select…</option>
                       <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                    </select>
                  </div>
               </div>
               <Input label="Date of Birth" type="date" value={form.patientDob} onChange={(e) => set('patientDob', e.target.value)} icon={<Calendar className="h-4 w-4" />} />
            </div>

            <div className="space-y-4 pt-4 border-t border-border/40">
               <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Protocol Selection</h3>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Active Pathway</label>
                  <select 
                    value={form.pathwayId} onChange={(e) => set('pathwayId', e.target.value)} required
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold"
                  >
                     <option value="">{isLoading ? 'Loading Protocols…' : 'Select Strategy…'}</option>
                     {pathways.map(p => <option key={p.id} value={p.id} disabled={p.status !== 'active'}>{p.name} ({p.status})</option>)}
                  </select>
               </div>
               
               {selectedPathway && (
                 <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                    <div className="flex items-center justify-between">
                       <Badge variant={categoryVariant(selectedPathway.category)} size="xs">{selectedPathway.category}</Badge>
                       <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{selectedPathway.defaultDurationDays} Days Path</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed font-medium">Standard entry point: <span className="text-primary font-black uppercase">"{selectedPathway.stages.find(s => s.stageType === 'entry')?.name ?? 'Stage 1'}"</span></p>
                    {selectedPathway.careTeam && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1 opacity-60">Manager: {selectedPathway.careTeam.name}</p>}
                 </motion.div>
               )}

               <Input label="Enrollment Effectivity Date" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Clinical Notes</label>
                  <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Justification or context for enrollment…" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium resize-none" />
               </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} type="button">Discard</Button>
            <Button size="sm" type="submit" loading={saving} disabled={!isValid || saving}>Enroll Patient</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EnrollmentPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [meta, setMeta] = useState<EnrollmentMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    api.get('/pathways', { params: { limit: 100 } }).then(r => setPathways(r.data.data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const p = { page: 1, limit: 50, ...(status !== 'ALL' && { status: status.toLowerCase() }) };
    api.get('/enrollments', { params: p }).then(r => {
      setEnrollments(r.data.data ?? []);
      setMeta(r.data.meta);
    }).finally(() => setLoading(false));
  }, [status, refreshKey]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enrollments.filter(e => !q || e.patientDisplayName?.toLowerCase().includes(q) || e.pathway?.name?.toLowerCase().includes(q));
  }, [enrollments, search]);

  return (
    <div className="space-y-6 pb-10">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Pop',   value: meta.total, icon: <Users className="h-5 w-5 text-blue-500" />, bg: 'bg-blue-500/10' },
          { label: 'Active Paths', value: enrollments.filter(e => e.status === 'active').length, icon: <TrendingUp className="h-5 w-5 text-emerald-500" />, bg: 'bg-emerald-500/10' },
          { label: 'Completed',    value: enrollments.filter(e => e.status === 'completed').length, icon: <CheckCircle2 className="h-5 w-5 text-violet-500" />, bg: 'bg-violet-500/10' },
          { label: 'Protocols',    value: pathways.filter(p => p.status === 'active').length, icon: <Route className="h-5 w-5 text-amber-500" />, bg: 'bg-amber-500/10' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card padding="glass" className="border-border/60">
               <div className="flex items-center gap-4">
                  <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0", s.bg)}>{s.icon}</div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                    <p className="text-xl font-black text-foreground font-display">{s.value}</p>
                  </div>
               </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Enrollment List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
               <Input placeholder="Filter clinical enrollments, patients, or protocols…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
               <div className="flex bg-muted/40 p-1 rounded-xl gap-1 border border-border/50">
                  {['ALL', 'ACTIVE', 'COMPLETED'].map(s => (
                    <button key={s} onClick={() => setStatus(s)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tighter transition-all", status === s ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:bg-muted")}>
                       {s}
                    </button>
                  ))}
               </div>
               <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>Enroll</Button>
            </div>
          </div>

          <Card padding="none" className="overflow-hidden border-border/60">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                   <thead>
                      <tr className="border-b border-border bg-muted/20">
                         {['Patient Context', 'Clinical Protocol', 'Lifecycle', 'Timeline', 'Efficacy'].map(h => (
                           <th key={h} className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</th>
                         ))}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border/40">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                           <tr key={i} className="animate-pulse">
                              <td colSpan={5} className="px-5 py-8 bg-muted/5" />
                           </tr>
                        ))
                      ) : filtered.map(e => {
                        const prog = e.totalTasks > 0 ? Math.round((e.completedTasks / e.totalTasks) * 100) : 0;
                        return (
                          <tr key={e.id} className="hover:bg-muted/10 transition-colors group cursor-pointer">
                             <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                   <Avatar name={e.patientDisplayName ?? 'U'} size="sm" className="ring-2 ring-transparent group-hover:ring-primary/20 transition-all" />
                                   <div className="min-w-0">
                                      <p className="text-sm font-bold text-foreground leading-tight">{e.patientDisplayName ?? '—'}</p>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 mt-1">{e.patientMrn ?? 'No MRN'}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-5 py-4 max-w-[180px]">
                                <p className="text-xs font-bold text-foreground truncate">{e.pathway?.name}</p>
                                <div className="mt-1 flex items-center gap-2">
                                   <Badge variant={categoryVariant(e.pathway?.category)} size="xs">{e.pathway?.category}</Badge>
                                </div>
                             </td>
                             <td className="px-5 py-4">
                                <StatusBadge status={e.status.toUpperCase()} />
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1.5 opacity-60">{e.currentStage?.name}</p>
                             </td>
                             <td className="px-5 py-4 whitespace-nowrap">
                                <p className="text-[10px] font-bold text-muted-foreground">{fmtDate(e.enrollmentDate ?? e.createdAt)}</p>
                             </td>
                             <td className="px-5 py-4">
                                <div className="w-28">
                                   <div className="flex justify-between text-[10px] font-black mb-1.5 text-foreground/70 uppercase tracking-tighter">
                                      <span>{e.completedTasks}/{e.totalTasks}</span>
                                      <span>{prog}%</span>
                                   </div>
                                   <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div className={cn("h-full rounded-full transition-all", prog >= 90 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${prog}%` }} />
                                   </div>
                                </div>
                             </td>
                          </tr>
                        );
                      })}
                   </tbody>
                </table>
                {!loading && filtered.length === 0 && (
                  <div className="py-20 text-center flex flex-col items-center">
                    <ClipboardList className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <p className="text-sm font-bold text-foreground">Registry Empty</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">No patients currently enrolled under this strategy.</p>
                  </div>
                )}
             </div>
          </Card>
        </div>

        {/* Protocols Panel */}
        <div className="space-y-6">
           <Card className="border-border/60">
              <CardHeader>
                 <CardTitle>Operating Protocols</CardTitle>
                 <CardSubtitle>Standard care strategies for recruitment</CardSubtitle>
              </CardHeader>
              <div className="space-y-3">
                 {pathways.map(p => (
                    <div key={p.id} className="p-4 rounded-2xl border border-border/60 bg-muted/10 hover:bg-muted/20 transition-all group">
                       <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                          <Badge variant={categoryVariant(p.category)} size="xs">{p.category}</Badge>
                       </div>
                       <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                          <span>{p.stages.length} Stages · {p.defaultDurationDays}D</span>
                          <span className={cn(p.status === 'active' ? "text-emerald-500" : "text-amber-500")}>{p.status}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </Card>
        </div>
      </div>

      <AnimatePresence>
        {showModal && <EnrollModal pathways={pathways} isLoading={false} error={null} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); refresh(); }} />}
      </AnimatePresence>
    </div>
  );
}
