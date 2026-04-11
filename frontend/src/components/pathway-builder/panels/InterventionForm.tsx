'use client';

import { useEffect, useState } from 'react';
import { BookCopy, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiCareTaskTemplate, ApiIntervention } from '@/types/pathway-builder.types';
import {
  INTERVENTION_TYPES,
  DELIVERY_MODES,
  FREQUENCY_TYPES,
  CARE_SETTINGS,
  OWNER_ROLES,
} from '../utils/constants';
import { fetchCareTaskTemplates } from '@/services/pathway.service';

interface InterventionFormProps {
  intervention?: ApiIntervention;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

export function InterventionForm({
  intervention,
  onSave,
  onClose,
}: InterventionFormProps) {
  const isEdit = !!intervention;
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'new' | 'library'>('new');
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ApiCareTaskTemplate | null>(null);
  const [libraryTemplates, setLibraryTemplates] = useState<ApiCareTaskTemplate[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [form, setForm] = useState({
    name: intervention?.name ?? '',
    interventionType: intervention?.interventionType ?? 'consultation',
    description: intervention?.description ?? '',
    careSetting: intervention?.careSetting ?? 'outpatient',
    deliveryMode: intervention?.deliveryMode ?? 'in_person',
    frequencyType: intervention?.frequencyType ?? 'once',
    frequencyValue: intervention?.frequencyValue ?? '',
    startDayOffset: intervention?.startDayOffset ?? 0,
    endDayOffset: intervention?.endDayOffset ?? '',
    defaultOwnerRole: intervention?.defaultOwnerRole ?? '',
    priority: intervention?.priority ?? 3,
    isCritical: intervention?.isCritical ?? false,
    sortOrder: intervention?.sortOrder ?? 0,
  });

  useEffect(() => {
    if (isEdit || mode !== 'library') return;

    const timeout = window.setTimeout(async () => {
      setLibraryLoading(true);
      setLibraryError(null);
      try {
        const data = await fetchCareTaskTemplates({
          q: libraryQuery.trim() || undefined,
          activeOnly: true,
        });
        setLibraryTemplates(data);
      } catch (error: any) {
        const message = error?.response?.data?.message;
        setLibraryError(Array.isArray(message) ? message.join(', ') : message ?? 'Failed to load task template library.');
      } finally {
        setLibraryLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [isEdit, libraryQuery, mode]);

  const applyTemplate = (template: ApiCareTaskTemplate) => {
    setForm({
      name: template.name,
      interventionType: template.interventionType,
      description: template.description ?? '',
      careSetting: template.careSetting ?? 'outpatient',
      deliveryMode: template.deliveryMode ?? 'in_person',
      frequencyType: template.frequencyType ?? 'once',
      frequencyValue: template.frequencyValue ?? '',
      startDayOffset: template.startDayOffset ?? 0,
      endDayOffset: template.endDayOffset ?? '',
      defaultOwnerRole: template.defaultOwnerRole ?? '',
      priority: template.priority ?? 3,
      isCritical: template.isCritical ?? false,
      sortOrder: 0,
    });
    setSelectedTemplate(template);
    setMode('new');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        frequencyValue: form.frequencyValue === '' ? undefined : Number(form.frequencyValue),
        endDayOffset: form.endDayOffset === '' ? undefined : Number(form.endDayOffset),
        defaultOwnerRole: form.defaultOwnerRole || undefined,
        saveToLibrary: !isEdit && saveToLibrary,
        sourceTemplateId: selectedTemplate?.id ?? null,
        sourceTemplateName: selectedTemplate?.name ?? null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full text-sm border border-border bg-card rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:bg-muted disabled:text-muted-foreground/50 transition-all';
  const labelCls = 'block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <h3 className="font-bold text-foreground">
            {isEdit ? 'Edit Intervention' : 'Add Intervention'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {!isEdit && (
            <div className="flex gap-2 rounded-xl bg-muted p-1 border border-border">
              <button
                type="button"
                onClick={() => setMode('new')}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
                  mode === 'new' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Create New
              </button>
              <button
                type="button"
                onClick={() => setMode('library')}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
                  mode === 'library' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Select From Library
              </button>
            </div>
          )}

          {!isEdit && mode === 'library' ? (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Search Library</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  <input
                    className={`${inputCls} pl-9`}
                    value={libraryQuery}
                    onChange={(e) => setLibraryQuery(e.target.value)}
                    placeholder="Search by name, description, or owner role"
                  />
                </div>
              </div>

              {libraryError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500 font-bold">
                  {libraryError}
                </div>
              )}

              <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-border p-2 custom-scrollbar">
                {libraryLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground/40">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : libraryTemplates.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No reusable task templates found
                  </div>
                ) : (
                  libraryTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="w-full rounded-xl border border-border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {template.name}
                            </span>
                            <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] uppercase font-bold text-muted-foreground">
                              {template.interventionType}
                            </span>
                          </div>
                          {template.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed">
                              {template.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60">
                            <span>{template.frequencyType}</span>
                            <span className="opacity-40">|</span>
                            <span>Day {template.startDayOffset}{template.endDayOffset != null ? `-${template.endDayOffset}` : '+'}</span>
                            {template.defaultOwnerRole && (
                              <>
                                <span className="opacity-40">|</span>
                                <span>{template.defaultOwnerRole}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-sm">
                          Use
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {!isEdit && selectedTemplate && (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
                      <BookCopy className="h-3.5 w-3.5" />
                      Prefilled from library
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">{selectedTemplate.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('library')}
                    className="shrink-0 text-xs font-bold text-primary hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

          {/* Basic */}
          <div>
            <label className={labelCls}>Name</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select
                className={inputCls}
                value={form.interventionType}
                onChange={(e) => setForm((p) => ({ ...p, interventionType: e.target.value }))}
              >
                {INTERVENTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Care Setting</label>
              <select
                className={inputCls}
                value={form.careSetting}
                onChange={(e) => setForm((p) => ({ ...p, careSetting: e.target.value }))}
              >
                {CARE_SETTINGS.map((cs) => (
                  <option key={cs.value} value={cs.value}>{cs.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Delivery */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Delivery Mode</label>
              <select
                className={inputCls}
                value={form.deliveryMode}
                onChange={(e) => setForm((p) => ({ ...p, deliveryMode: e.target.value }))}
              >
                {DELIVERY_MODES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Owner Role</label>
              <select
                className={inputCls}
                value={form.defaultOwnerRole}
                onChange={(e) => setForm((p) => ({ ...p, defaultOwnerRole: e.target.value }))}
              >
                <option value="">None</option>
                {OWNER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Frequency</label>
              <select
                className={inputCls}
                value={form.frequencyType}
                onChange={(e) => setForm((p) => ({ ...p, frequencyType: e.target.value }))}
              >
                {FREQUENCY_TYPES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Start Day</label>
              <input
                type="number"
                className={inputCls}
                value={form.startDayOffset}
                onChange={(e) => setForm((p) => ({ ...p, startDayOffset: Number(e.target.value) }))}
                min={0}
              />
            </div>
            <div>
              <label className={labelCls}>End Day</label>
              <input
                type="number"
                className={inputCls}
                value={form.endDayOffset}
                onChange={(e) => setForm((p) => ({ ...p, endDayOffset: e.target.value }))}
                min={0}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Priority (1-5)</label>
              <input
                type="number"
                className={inputCls}
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                min={1}
                max={5}
              />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.isCritical}
                  onChange={(e) => setForm((p) => ({ ...p, isCritical: e.target.checked }))}
                  className="w-4 h-4 rounded border-border bg-muted text-red-500 focus:ring-red-500/30 transition-all cursor-pointer"
                />
                Critical
              </label>
            </div>
          </div>

          {!isEdit && (
            <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer group pt-2">
              <input
                type="checkbox"
                checked={saveToLibrary}
                onChange={(e) => setSaveToLibrary(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary/30 transition-all cursor-pointer"
              />
              Save as reusable task template in library
            </label>
          )}
            </>
          )}
        </form>

        {/* Actions */}
        <div className="flex justify-end gap-2 p-5 border-t border-border bg-muted/10">
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground px-5 py-2.5 rounded-lg hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || (mode === 'library' && !isEdit) || !form.name}
            className="text-[10px] font-black uppercase tracking-widest text-primary-foreground bg-primary hover:bg-primary/90 px-6 py-2.5 rounded-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />
            ) : null}
            {isEdit ? 'Update Intervention' : 'Create Intervention'}
          </button>
        </div>
      </div>
    </div>
  );
}
