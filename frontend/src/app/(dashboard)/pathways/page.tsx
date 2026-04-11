'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Plus, Route, CheckCircle2, PlayCircle, PauseCircle,
  X, ChevronRight, AlertCircle, Loader2, Layers, Clock,
  Users, Calendar, BarChart2, Settings, Activity,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { fetchNamedCareTeams, type ApiNamedCareTeam } from '@/services/care-team.service';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Stage {
  id: string;
  name: string;
  code: string;
  stageType: 'entry' | 'intermediate' | 'decision' | 'terminal';
  sortOrder: number;
  expectedDurationDays?: number;
  careSetting?: string;
}

interface Pathway {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  status: string;
  version: number;
  defaultDurationDays: number;
  applicableSettings: string[];
  careTeamId?: string | null;
  careTeam?: {
    id: string;
    name: string;
    description?: string | null;
    _count?: { members: number };
  } | null;
  createdAt: string;
  updatedAt: string;
  stages: (Stage & { name: string; sortOrder: number })[];
  _count?: { enrollments: number };
}

interface PathwayMeta { total: number; page: number; limit: number; totalPages: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { pill: string; bar: string; icon: string }> = {
  diabetes:     { pill: 'bg-sapphire-500/10 text-sapphire-600 dark:text-sapphire-400', bar: 'bg-sapphire-500', icon: '🩸' },
  hypertension: { pill: 'bg-red-500/10 text-red-600 dark:text-red-400',        bar: 'bg-red-500',      icon: '❤️' },
  cardiac:      { pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',  bar: 'bg-emerald-500',  icon: '🫀' },
  respiratory:  { pill: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',        bar: 'bg-sky-500',      icon: '🫁' },
  wellness:     { pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', icon: '🌿' },
  oncology:     { pill: 'bg-amethyst-500/10 text-amethyst-600 dark:text-amethyst-400', bar: 'bg-amethyst-500', icon: '🔬' },
  rehab:        { pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',  bar: 'bg-amber-500',    icon: '🏃' },
  custom:       { pill: 'bg-muted/50 text-muted-foreground',                 bar: 'bg-muted-foreground', icon: '⚙️' },
};

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.custom;
}

function fmtDuration(days: number) {
  if (days >= 365) return `${Math.round(days / 365)}y`;
  if (days >= 30)  return `${Math.round(days / 30)}mo`;
  return `${days}d`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function stageTypeBadge(type: string) {
  const map: Record<string, string> = {
    entry:        'bg-primary/10 text-primary border-primary/20',
    intermediate: 'bg-muted text-muted-foreground border-border',
    decision:     'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    terminal:     'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  };
  return map[type] ?? 'bg-muted text-muted-foreground';
}

// ─── Create Pathway Modal ──────────────────────────────────────────────────────

function CreatePathwayModal({
  onClose,
  onSuccess,
  careTeams,
}: {
  onClose: () => void;
  onSuccess: () => void;
  careTeams: ApiNamedCareTeam[];
}) {
  const CATEGORIES = ['diabetes', 'hypertension', 'cardiac', 'rehab', 'respiratory', 'oncology', 'wellness', 'custom'];
  const CARE_SETTINGS = ['outpatient', 'inpatient', 'home_care'];
  const BLANK_FORM = {
    name: '', description: '', category: '', defaultDurationDays: '90',
    applicableSettings: ['outpatient'] as string[],
  };
  const BLANK_STAGE = {
    code: '', name: '', stageType: 'intermediate' as string,
    sortOrder: 1, expectedDurationDays: '',
  };

  const [form, setForm]     = useState(BLANK_FORM);
  const [stages, setStages] = useState([{ ...BLANK_STAGE, stageType: 'entry', sortOrder: 1 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [step, setStep]     = useState<'info' | 'stages'>('info');
  const [careTeamId, setCareTeamId] = useState('');

  const set = (k: keyof typeof BLANK_FORM, v: any) => setForm((f) => ({ ...f, [k]: v }));

  function toggleSetting(s: string) {
    set('applicableSettings', form.applicableSettings.includes(s)
      ? form.applicableSettings.filter((x) => x !== s)
      : [...form.applicableSettings, s]);
  }

  function updateStage(i: number, k: string, v: any) {
    setStages((prev) => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  }

  function addStage() {
    setStages((prev) => [...prev, {
      code: '', name: '', stageType: 'intermediate',
      sortOrder: prev.length + 1, expectedDurationDays: '',
    }]);
  }

  function removeStage(i: number) {
    setStages((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, sortOrder: idx + 1 })));
  }

  const infoValid = form.name.trim() && form.category &&
    Number(form.defaultDurationDays) > 0 && form.applicableSettings.length > 0;

  const stagesValid = stages.length > 0 &&
    stages.every((s) => s.code.trim() && s.name.trim()) &&
    stages.filter((s) => s.stageType === 'entry').length === 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!infoValid || !stagesValid) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/pathways', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        defaultDurationDays: Number(form.defaultDurationDays),
        applicableSettings: form.applicableSettings,
        careTeamId: careTeamId || undefined,
        stages: stages.map((s) => ({
          code: s.code.trim().toUpperCase(),
          name: s.name.trim(),
          stageType: s.stageType,
          sortOrder: s.sortOrder,
          expectedDurationDays: s.expectedDurationDays ? Number(s.expectedDurationDays) : undefined,
          careSetting: 'any',
          autoTransition: false,
        })),
      });
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create pathway.'));
      setStep('info');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative w-full sm:max-w-xl bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden border border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">New Clinical Pathway</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Define a reusable care pathway template</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex px-6 pt-4 gap-1 bg-muted/10 pb-2">
          {(['info', 'stages'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { if (s === 'stages' && !infoValid) return; setStep(s); }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                step === s ? "bg-primary text-white shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {s === 'info' ? '1. Pathway Info' : '2. Stages'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {step === 'info' && (
              <>
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary font-medium tracking-tight">
                  Pathway code will be generated automatically using the tenant format.
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-1.5">Category *</label>
                    <select value={form.category} onChange={(e) => set('category', e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition">
                      <option value="">Select category…</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-1.5">Pathway Name *</label>
                    <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Type 2 Diabetes Management" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-1.5">Description</label>
                    <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3}
                      placeholder="Brief description of the pathway purpose…"
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-1.5">Duration (days) *</label>
                      <Input type="number" min={1} value={form.defaultDurationDays} onChange={(e) => set('defaultDurationDays', e.target.value)}
                        className="w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-1.5">Care Team</label>
                      <select value={careTeamId} onChange={(e) => setCareTeamId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-border text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition">
                        <option value="">No default team</option>
                        {careTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">Applicable Care Settings *</label>
                    <div className="flex gap-2 flex-wrap">
                      {CARE_SETTINGS.map((s) => (
                        <button key={s} type="button" onClick={() => toggleSetting(s)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                            form.applicableSettings.includes(s) 
                              ? "bg-primary text-white border-primary shadow-sm" 
                              : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                          )}>
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 'stages' && (
              <div className="space-y-3">
                {stages.map((stage, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-border bg-muted/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stage {i + 1}</span>
                      {stages.length > 1 && (
                        <button type="button" onClick={() => removeStage(i)} className="text-muted-foreground hover:text-red-500 transition">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wider mb-1">Code *</label>
                        <input value={stage.code} onChange={(e) => updateStage(i, 'code', e.target.value)}
                          placeholder="ASSESSMENT"
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wider mb-1">Type *</label>
                        <select value={stage.stageType} onChange={(e) => updateStage(i, 'stageType', e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition">
                          <option value="entry">Entry</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="decision">Decision</option>
                          <option value="terminal">Terminal</option>
                        </select>
                      </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-foreground/60 uppercase tracking-wider mb-1">Name *</label>
                        <input value={stage.name} onChange={(e) => updateStage(i, 'name', e.target.value)}
                          placeholder="Stage name"
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                    </div>
                  </div>
                ))}

                <button type="button" onClick={addStage}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-border text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" /> Add Gateway Stage
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 bg-muted/20">
            <button type="button" onClick={onClose} className="text-sm font-bold text-muted-foreground hover:text-foreground transition">Cancel</button>
            <div className="flex gap-2">
              {step === 'info' ? (
                <Button disabled={!infoValid} onClick={() => setStep('stages')} iconRight={<ChevronRight className="h-4 w-4" />}>
                  Define Stages
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setStep('info')}>Back</Button>
                  <Button onClick={handleSubmit} loading={saving} disabled={!stagesValid}>
                    Create Pathway
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Pathway Detail Drawer ─────────────────────────────────────────────────────

function PathwayDetailDrawer({
  pathway,
  onClose,
  careTeams,
  onPathwayUpdated,
}: {
  pathway: Pathway;
  onClose: () => void;
  careTeams: ApiNamedCareTeam[];
  onPathwayUpdated: (pathway: Pathway) => void;
}) {
  const cat = getCategoryStyle(pathway.category);
  const [selectedCareTeamId, setSelectedCareTeamId] = useState(pathway.careTeamId ?? '');
  const [savingCareTeam, setSavingCareTeam] = useState(false);
  const [careTeamError, setCareTeamError] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    setSelectedCareTeamId(pathway.careTeamId ?? '');
    setCareTeamError(null);
  }, [pathway.careTeamId, pathway.id]);

  async function handleSaveCareTeam() {
    if (pathway.status === 'active') return;
    setSavingCareTeam(true);
    setCareTeamError(null);
    try {
      const res = await api.put<Pathway>(`/pathways/${pathway.id}`, {
        careTeamId: selectedCareTeamId || null,
      });
      onPathwayUpdated(res.data);
    } catch (err: any) {
      setCareTeamError(err?.response?.data?.message ?? 'Failed to update care team.');
    } finally {
      setSavingCareTeam(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="relative w-full max-w-md bg-card shadow-2xl flex flex-col h-full overflow-hidden border-l border-border"
      >
        <div className={cn("h-1.5 w-full", cat.bar)} />

        <div className="flex items-start justify-between px-6 py-6 border-b border-border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-[10px] font-bold font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-lg border border-border uppercase tracking-tight">
                {pathway.code}
              </span>
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", cat.pill)}>
                {cat.icon} {pathway.category}
              </span>
              <StatusBadge status={pathway.status} />
            </div>
            <h2 className="text-xl font-bold text-foreground font-display leading-tight">{pathway.name}</h2>
            {pathway.description && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{pathway.description}</p>}
          </div>
          <button onClick={onClose} className="ml-4 h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-transparent hover:border-border">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <Button asChild block>
            <Link href={`/pathways/${pathway.id}/builder`} className="flex items-center gap-2 justify-center">
              <Settings className="h-4 w-4" />
              Open Pathway Builder
            </Link>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Clock className="h-4 w-4 text-primary" />, label: 'Duration', value: fmtDuration(pathway.defaultDurationDays) },
              { icon: <Layers className="h-4 w-4 text-amethyst-500" />, label: 'Stages', value: pathway.stages.length },
              { icon: <Users className="h-4 w-4 text-emerald-500" />, label: 'Enrolled', value: pathway._count?.enrollments ?? 0 },
            ].map((m) => (
              <div key={m.label} className="bg-muted/30 border border-border/50 rounded-2xl p-3 text-center transition-all hover:bg-muted/50">
                <div className="flex justify-center mb-1.5 opacity-80">{m.icon}</div>
                <p className="text-lg font-bold text-foreground font-display">{m.value}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{m.label}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Pathway Stages Flow</p>
            <div className="relative space-y-4">
              <div className="absolute left-[13px] top-6 bottom-6 w-0.5 bg-border/40" />
              {[...pathway.stages].sort((a, b) => a.sortOrder - b.sortOrder).map((stage, i) => (
                <div key={stage.id} className="relative flex items-start gap-4 pl-8 group">
                  <div className={cn(
                    "absolute left-0 h-[28px] w-[28px] rounded-xl flex items-center justify-center text-[11px] font-bold border-2 border-card shadow-sm z-10 transition-transform group-hover:scale-110",
                    stage.stageType === 'entry' ? "bg-primary text-white" :
                    stage.stageType === 'terminal' ? "bg-emerald-500 text-white" :
                    stage.stageType === 'decision' ? "bg-amber-500 text-white" :
                    "bg-muted text-muted-foreground border-border"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 bg-muted/20 border border-border/60 rounded-2xl p-4 transition-all group-hover:bg-muted/40 group-hover:border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground leading-tight">{stage.name}</p>
                        <p className="text-[10px] font-bold font-mono text-muted-foreground mt-1 opacity-60 uppercase tracking-tighter">{stage.code}</p>
                      </div>
                      <Badge variant={stage.stageType === 'entry' ? 'info' : stage.stageType === 'terminal' ? 'success' : stage.stageType === 'decision' ? 'warning' : 'neutral'} size="xs">
                        {stage.stageType}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Management</p>
            <Card padding="sm" className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Primary Care Team</label>
                {pathway.status === 'draft' ? (
                  <div className="space-y-3">
                    <select
                      value={selectedCareTeamId}
                      onChange={(e) => setSelectedCareTeamId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-muted/20 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    >
                      <option value="">No default team mapped</option>
                      {careTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                    <Button block size="sm" onClick={handleSaveCareTeam} loading={savingCareTeam}>Save Team Config</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{pathway.careTeam?.name ?? 'Unassigned'}</p>
                      <p className="text-[10px] text-muted-foreground font-bold tracking-tight">{pathway.careTeam?._count?.members ?? 0} team members</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Pathway Card ──────────────────────────────────────────────────────────────

function PathwayCard({ pathway, onClick }: { pathway: Pathway; onClick: () => void }) {
  const cat = getCategoryStyle(pathway.category);

  return (
    <Card hover onClick={onClick} padding="none" className="group cursor-pointer overflow-hidden text-left border-border/60 hover:border-primary/30">
      <div className={cn("h-1.5 w-full", cat.bar)} />
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-[10px] font-bold font-mono text-muted-foreground/60 bg-muted/40 px-2 py-0.5 rounded-lg border border-border tracking-tighter">
                {pathway.code}
              </span>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", cat.pill)}>
                {cat.icon} {pathway.category}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground leading-tight font-display transition-colors group-hover:text-primary">
              {pathway.name}
            </h3>
            {pathway.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed opacity-80">{pathway.description}</p>
            )}
          </div>
          <StatusBadge status={pathway.status} />
        </div>

        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto no-scrollbar">
          {[...pathway.stages]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-1">
                <span className={cn(
                  "h-2.5 w-2.5 rounded-full transition-all group-hover:scale-125",
                  stage.stageType === 'entry' ? 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]' :
                  stage.stageType === 'terminal' ? 'bg-emerald-400' :
                  stage.stageType === 'decision' ? 'bg-amber-400' :
                  'bg-border'
                )} title={stage.name} />
                {i < pathway.stages.length - 1 && <span className="h-0.5 w-4 bg-border/40" />}
              </div>
            ))}
          <span className="text-[10px] font-bold text-muted-foreground uppercase ml-2 tracking-widest opacity-60">{pathway.stages.length} stages</span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border/40">
          <div className="text-center">
            <p className="text-sm font-bold text-foreground font-display">{fmtDuration(pathway.defaultDurationDays)}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-70">Duration</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground font-display">{pathway._count?.enrollments ?? 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-70">Enrolled</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground font-display">v{pathway.version}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-70">Version</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PathwaysPage() {
  const CATEGORY_FILTERS = ['ALL', 'diabetes', 'hypertension', 'cardiac', 'respiratory', 'wellness', 'oncology', 'rehab', 'custom'];
  const [pathways, setPathways]     = useState<Pathway[]>([]);
  const [meta, setMeta]             = useState<PathwayMeta | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [categoryFilter, setCatFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]     = useState<Pathway | null>(null);
  const [careTeams, setCareTeams]   = useState<ApiNamedCareTeam[]>([]);

  const fetchPathways = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50', sortBy: 'createdAt', sortOrder: 'desc' });
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      const res = await api.get<{ data: Pathway[]; meta: PathwayMeta }>(`/pathways?${params}`);
      setPathways(res.data.data);
      setMeta(res.data.meta);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load pathways.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => { fetchPathways(); }, [fetchPathways]);
  useEffect(() => {
    fetchNamedCareTeams()
      .then(setCareTeams)
      .catch(() => setCareTeams([]));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return pathways;
    const q = search.toLowerCase();
    return pathways.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [pathways, search]);

  const stats = useMemo(() => ({
    total:    pathways.length,
    active:   pathways.filter((p) => p.status === 'active').length,
    draft:    pathways.filter((p) => p.status === 'draft').length,
    enrolled: pathways.reduce((s, p) => s + (p._count?.enrollments ?? 0), 0),
  }), [pathways]);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Pathways', value: stats.total,   icon: <Route className="h-5 w-5" />,   color: 'text-amethyst-500', bg: 'bg-amethyst-500/10' },
          { label: 'Active Status',  value: stats.active,  icon: <PlayCircle className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Draft Templates',value: stats.draft,   icon: <PauseCircle className="h-5 w-5" />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Total Enrolled', value: stats.enrolled,icon: <Users className="h-5 w-5" />,      color: 'text-primary', bg: 'bg-primary/10' },
        ].map((s, idx) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card padding="sm" className="border-border/60 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-4">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", s.bg, s.color)}>{s.icon}</div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground font-display mt-0.5">
                    {loading ? <span className="inline-block h-6 w-12 bg-muted rounded animate-pulse" /> : s.value}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:flex-1">
          <Input
            placeholder="Search clinical pathways, codes, categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex w-full sm:w-auto gap-2">
           <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)} className="w-full sm:w-auto">
            New Pathway
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-1">Filter by</span>
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-bold transition-all border",
              categoryFilter === cat
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                : "bg-muted/40 text-muted-foreground border-border hover:border-primary/30 hover:bg-muted/60"
            )}
          >
            {cat === 'ALL' ? 'All Pathways' : `${CATEGORY_COLORS[cat]?.icon ?? ''} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse p-6">
                <div className="h-1 bg-muted w-full mb-6" />
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full opacity-60" />
                    <div className="h-3 bg-muted rounded w-1/2 opacity-60" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
                    {[1,2,3].map((x) => <div key={x} className="h-10 bg-muted rounded-xl" />)}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : error ? (
           <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 bg-card rounded-3xl border border-border border-dashed"
            >
              <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <p className="text-base font-bold text-foreground">Failed to load content</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchPathways} className="mt-6">Retry Request</Button>
            </motion.div>
        ) : (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {filtered.map((pw) => (
              <PathwayCard key={pw.id} pathway={pw} onClick={() => setSelected(pw)} />
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full py-32 text-center bg-card rounded-3xl border border-border border-dashed">
                <Route className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-bold text-foreground">No matching pathways</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search ? `We couldn't find any results for "${search}"` : 'No templates found in this category.'}
                </p>
                <Button variant="outline" className="mt-8" onClick={() => { setSearch(''); setCatFilter('ALL'); }}>Clear all filters</Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <PathwayDetailDrawer
            pathway={selected}
            onClose={() => setSelected(null)}
            careTeams={careTeams}
            onPathwayUpdated={(updated) => {
              setSelected(updated);
              setPathways((current) => current.map((item) => (
                item.id === updated.id ? { ...item, ...updated, _count: updated._count ?? item._count } : item
              )));
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && (
          <CreatePathwayModal
            onClose={() => setShowCreate(false)}
            onSuccess={() => { setShowCreate(false); fetchPathways(); }}
            careTeams={careTeams}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
