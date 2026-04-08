'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  createdAt: string;
  updatedAt: string;
  stages: (Stage & { name: string; sortOrder: number })[];
  _count: { enrollments: number };
}

interface PathwayMeta { total: number; page: number; limit: number; totalPages: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { pill: string; bar: string; icon: string }> = {
  diabetes:     { pill: 'bg-blue-100 text-blue-700',    bar: 'bg-blue-500',    icon: '🩸' },
  hypertension: { pill: 'bg-red-100 text-red-700',      bar: 'bg-red-500',     icon: '❤️' },
  cardiac:      { pill: 'bg-rose-100 text-rose-700',    bar: 'bg-rose-500',    icon: '🫀' },
  respiratory:  { pill: 'bg-sky-100 text-sky-700',      bar: 'bg-sky-500',     icon: '🫁' },
  wellness:     { pill: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', icon: '🌿' },
  oncology:     { pill: 'bg-purple-100 text-purple-700', bar: 'bg-purple-500',  icon: '🔬' },
  rehab:        { pill: 'bg-amber-100 text-amber-700',  bar: 'bg-amber-500',   icon: '🏃' },
  custom:       { pill: 'bg-slate-100 text-slate-600',  bar: 'bg-slate-400',   icon: '⚙️' },
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
    entry:        'bg-blue-100 text-blue-700',
    intermediate: 'bg-slate-100 text-slate-600',
    decision:     'bg-amber-100 text-amber-700',
    terminal:     'bg-emerald-100 text-emerald-700',
  };
  return map[type] ?? 'bg-slate-100 text-slate-600';
}

// ─── Create Pathway Modal ──────────────────────────────────────────────────────

const CATEGORIES = ['diabetes', 'hypertension', 'cardiac', 'rehab', 'respiratory', 'oncology', 'wellness', 'custom'];
const CARE_SETTINGS = ['outpatient', 'inpatient', 'home_care'];

const BLANK_FORM = {
  code: '', name: '', description: '', category: '', defaultDurationDays: '90',
  applicableSettings: ['outpatient'] as string[],
};

const BLANK_STAGE = {
  code: '', name: '', stageType: 'intermediate' as string,
  sortOrder: 1, expectedDurationDays: '',
};

function CreatePathwayModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm]     = useState(BLANK_FORM);
  const [stages, setStages] = useState([{ ...BLANK_STAGE, stageType: 'entry', sortOrder: 1 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [step, setStep]     = useState<'info' | 'stages'>('info');

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

  const infoValid = form.code.trim() && form.name.trim() && form.category &&
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
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        defaultDurationDays: Number(form.defaultDurationDays),
        applicableSettings: form.applicableSettings,
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New Clinical Pathway</h2>
            <p className="text-xs text-slate-500 mt-0.5">Define a reusable care pathway template</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex px-6 pt-4 gap-1">
          {(['info', 'stages'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { if (s === 'stages' && !infoValid) return; setStep(s); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${step === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              {s === 'info' ? '1. Pathway Info' : '2. Stages'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {step === 'info' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Code <span className="text-red-500">*</span></label>
                    <input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="e.g. DM-MGMT-002"
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                    <select value={form.category} onChange={(e) => set('category', e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition">
                      <option value="">Select…</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Pathway Name <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Type 2 Diabetes — Intensive Management"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
                    placeholder="Brief description of the pathway's purpose and target patient population…"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Default Duration (days) <span className="text-red-500">*</span></label>
                  <input type="number" min={1} value={form.defaultDurationDays} onChange={(e) => set('defaultDurationDays', e.target.value)}
                    className="w-40 h-10 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                  <span className="ml-2 text-xs text-slate-500">≈ {fmtDuration(Number(form.defaultDurationDays) || 0)}</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Applicable Care Settings <span className="text-red-500">*</span></label>
                  <div className="flex gap-2 flex-wrap">
                    {CARE_SETTINGS.map((s) => (
                      <button key={s} type="button" onClick={() => toggleSetting(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${form.applicableSettings.includes(s) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}>
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 'stages' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Define the stages of this pathway. One stage must be marked as <strong>Entry</strong>.</p>
                {stages.map((stage, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Stage {i + 1}</span>
                      {stages.length > 1 && (
                        <button type="button" onClick={() => removeStage(i)} className="text-slate-400 hover:text-red-500 transition">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Code *</label>
                        <input value={stage.code} onChange={(e) => updateStage(i, 'code', e.target.value)}
                          placeholder="INITIAL-ASSESSMENT"
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Type *</label>
                        <select value={stage.stageType} onChange={(e) => updateStage(i, 'stageType', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition">
                          <option value="entry">Entry</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="decision">Decision</option>
                          <option value="terminal">Terminal</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Name *</label>
                        <input value={stage.name} onChange={(e) => updateStage(i, 'name', e.target.value)}
                          placeholder="Initial Assessment"
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Duration (days)</label>
                        <input type="number" min={1} value={stage.expectedDurationDays}
                          onChange={(e) => updateStage(i, 'expectedDurationDays', e.target.value)}
                          placeholder="e.g. 30"
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" onClick={addStage}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Stage
                </button>

                {stages.filter((s) => s.stageType === 'entry').length !== 1 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> Exactly one stage must have type <strong>Entry</strong>.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
            <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 transition">Cancel</button>
            <div className="flex gap-2">
              {step === 'info' && (
                <button type="button" disabled={!infoValid} onClick={() => setStep('stages')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed">
                  Next: Stages <ChevronRight className="h-4 w-4" />
                </button>
              )}
              {step === 'stages' && (
                <>
                  <button type="button" onClick={() => setStep('info')}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition">
                    Back
                  </button>
                  <button type="submit" disabled={!stagesValid || saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Creating…' : 'Create Pathway'}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pathway Detail Drawer ─────────────────────────────────────────────────────

function PathwayDetailDrawer({ pathway, onClose }: { pathway: Pathway; onClose: () => void }) {
  const cat = getCategoryStyle(pathway.category);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Top bar */}
        <div className={`h-1 w-full ${cat.bar}`} />

        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono font-semibold text-slate-500">{pathway.code}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cat.pill}`}>
                {cat.icon} {pathway.category}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${pathway.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {pathway.status}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-snug">{pathway.name}</h2>
            {pathway.description && <p className="text-xs text-slate-500 mt-1">{pathway.description}</p>}
          </div>
          <button onClick={onClose} className="ml-3 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Clock className="h-4 w-4 text-slate-400" />, label: 'Duration', value: fmtDuration(pathway.defaultDurationDays) },
              { icon: <Layers className="h-4 w-4 text-slate-400" />, label: 'Stages', value: pathway.stages.length },
              { icon: <Users className="h-4 w-4 text-slate-400" />, label: 'Enrolled', value: pathway._count.enrollments },
            ].map((m) => (
              <div key={m.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1">{m.icon}</div>
                <p className="text-lg font-bold text-slate-900">{m.value}</p>
                <p className="text-[10px] text-slate-500">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Care settings */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Applicable Settings</p>
            <div className="flex flex-wrap gap-2">
              {pathway.applicableSettings.map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                  {s.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Stages timeline */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pathway Stages</p>
            <div className="relative">
              {/* Connector line */}
              <div className="absolute left-3.5 top-4 bottom-4 w-px bg-slate-200" />
              <div className="space-y-3">
                {[...pathway.stages].sort((a, b) => a.sortOrder - b.sortOrder).map((stage, i) => (
                  <div key={stage.id} className="relative flex items-start gap-3 pl-9">
                    <div className={`absolute left-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm z-10 ${
                      stage.stageType === 'entry' ? 'bg-blue-500 text-white' :
                      stage.stageType === 'terminal' ? 'bg-emerald-500 text-white' :
                      stage.stageType === 'decision' ? 'bg-amber-500 text-white' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{stage.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{stage.code}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${stageTypeBadge(stage.stageType)}`}>
                          {stage.stageType}
                        </span>
                      </div>
                      {stage.expectedDurationDays && (
                        <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> ~{fmtDuration(stage.expectedDurationDays)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Info</p>
            <div className="space-y-1.5 text-xs">
              {[
                ['Version', `v${pathway.version}`],
                ['Created', fmtDate(pathway.createdAt)],
                ['Updated', fmtDate(pathway.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-700">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pathway Card ──────────────────────────────────────────────────────────────

function PathwayCard({ pathway, onClick }: { pathway: Pathway; onClick: () => void }) {
  const cat = getCategoryStyle(pathway.category);

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150 overflow-hidden group"
    >
      {/* Category colour bar */}
      <div className={`h-1 w-full ${cat.bar}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                {pathway.code}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cat.pill}`}>
                {cat.icon} {pathway.category}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
              {pathway.name}
            </h3>
            {pathway.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pathway.description}</p>
            )}
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
            pathway.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
            pathway.status === 'draft'  ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {pathway.status}
          </span>
        </div>

        {/* Stages mini-timeline */}
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          {[...pathway.stages]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  stage.stageType === 'entry' ? 'bg-blue-400' :
                  stage.stageType === 'terminal' ? 'bg-emerald-400' :
                  stage.stageType === 'decision' ? 'bg-amber-400' :
                  'bg-slate-300'
                }`} title={stage.name} />
                {i < pathway.stages.length - 1 && <span className="h-px w-3 bg-slate-200" />}
              </div>
            ))}
          <span className="text-[10px] text-slate-400 ml-1">{pathway.stages.length} stages</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">{fmtDuration(pathway.defaultDurationDays)}</p>
            <p className="text-[10px] text-slate-400">Duration</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">{pathway._count.enrollments}</p>
            <p className="text-[10px] text-slate-400">Enrolled</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">v{pathway.version}</p>
            <p className="text-[10px] text-slate-400">Version</p>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const CATEGORY_FILTERS = ['ALL', 'diabetes', 'hypertension', 'cardiac', 'respiratory', 'wellness', 'oncology', 'rehab', 'custom'];

export default function PathwaysPage() {
  const [pathways, setPathways]     = useState<Pathway[]>([]);
  const [meta, setMeta]             = useState<PathwayMeta | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [categoryFilter, setCatFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]     = useState<Pathway | null>(null);

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
    enrolled: pathways.reduce((s, p) => s + p._count.enrollments, 0),
  }), [pathways]);

  return (
    <div className="space-y-5">

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Pathways', value: stats.total,   icon: <Route className="h-5 w-5 text-violet-500" />,   bg: 'bg-violet-50' },
          { label: 'Active',         value: stats.active,  icon: <PlayCircle className="h-5 w-5 text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Draft',          value: stats.draft,   icon: <PauseCircle className="h-5 w-5 text-amber-500" />, bg: 'bg-amber-50' },
          { label: 'Total Enrolled', value: stats.enrolled,icon: <Users className="h-5 w-5 text-blue-500" />,      bg: 'bg-blue-50' },
        ].map((s) => (
          <Card key={s.label} padding="sm">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">
                  {loading ? <span className="inline-block h-5 w-8 bg-slate-200 rounded animate-pulse" /> : s.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search pathways, codes, categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
          New Pathway
        </Button>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              categoryFilter === cat
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat === 'ALL' ? 'All Categories' : `${CATEGORY_COLORS[cat]?.icon ?? ''} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={fetchPathways} className="ml-auto text-xs underline font-medium hover:no-underline">Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="h-1 bg-slate-200 w-full" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="flex gap-1 mt-4">
                  {[1,2,3].map((x) => <div key={x} className="h-2 w-2 rounded-full bg-slate-200" />)}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  {[1,2,3].map((x) => <div key={x} className="h-8 bg-slate-100 rounded-lg" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pathway grid */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((pw) => (
              <PathwayCard key={pw.id} pathway={pw} onClick={() => setSelected(pw)} />
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <Route className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No pathways found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {search ? 'Try adjusting your search or category filter.' : 'Create your first clinical pathway to get started.'}
                </p>
                {!search && (
                  <button onClick={() => setShowCreate(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
                    + New Pathway
                  </button>
                )}
              </div>
            )}
          </div>

          {meta && meta.total > 0 && (
            <p className="text-xs text-slate-400 text-center">
              Showing {filtered.length} of {meta.total} pathway{meta.total !== 1 ? 's' : ''}
            </p>
          )}
        </>
      )}

      {/* Detail drawer */}
      {selected && (
        <PathwayDetailDrawer pathway={selected} onClose={() => setSelected(null)} />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreatePathwayModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchPathways(); }}
        />
      )}
    </div>
  );
}
