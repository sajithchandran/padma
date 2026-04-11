'use client';

import { useEffect, useState } from 'react';
import { BookCopy, Loader2, Search, X } from 'lucide-react';
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
    'w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-slate-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">
            {isEdit ? 'Edit Intervention' : 'Add Intervention'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isEdit && (
            <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Create New
              </button>
              <button
                type="button"
                onClick={() => setMode('library')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === 'library' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
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
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    value={libraryQuery}
                    onChange={(e) => setLibraryQuery(e.target.value)}
                    placeholder="Search by name, description, or owner role"
                  />
                </div>
              </div>

              {libraryError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {libraryError}
                </div>
              )}

              <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {libraryLoading ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : libraryTemplates.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    No reusable task templates found
                  </div>
                ) : (
                  libraryTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-800">
                              {template.name}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                              {template.interventionType}
                            </span>
                          </div>
                          {template.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {template.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                            <span>{template.frequencyType}</span>
                            <span>Day {template.startDayOffset}{template.endDayOffset != null ? `-${template.endDayOffset}` : '+'}</span>
                            {template.defaultOwnerRole && <span>{template.defaultOwnerRole}</span>}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white">
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
                <div className="flex items-start justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-blue-900">
                      <BookCopy className="h-3.5 w-3.5" />
                      Prefilled from library
                    </p>
                    <p className="mt-1 text-sm text-blue-800">{selectedTemplate.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('library')}
                    className="shrink-0 text-xs font-medium text-blue-700 hover:text-blue-800"
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
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isCritical}
                  onChange={(e) => setForm((p) => ({ ...p, isCritical: e.target.checked }))}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                Critical intervention
              </label>
            </div>
          </div>

          {!isEdit && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={saveToLibrary}
                onChange={(e) => setSaveToLibrary(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Save as reusable task template in library
            </label>
          )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-600 hover:text-slate-800 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || mode === 'library' || !form.name}
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
              ) : null}
              {isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
