'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { ApiIntervention } from '@/types/pathway-builder.types';
import {
  INTERVENTION_TYPES,
  DELIVERY_MODES,
  FREQUENCY_TYPES,
  CARE_SETTINGS,
  OWNER_ROLES,
} from '../utils/constants';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        frequencyValue: form.frequencyValue === '' ? null : Number(form.frequencyValue),
        endDayOffset: form.endDayOffset === '' ? null : Number(form.endDayOffset),
        defaultOwnerRole: form.defaultOwnerRole || null,
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
              disabled={saving || !form.name}
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
