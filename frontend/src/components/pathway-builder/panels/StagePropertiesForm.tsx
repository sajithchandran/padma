'use client';

import { useState, useEffect } from 'react';
import type { ApiStage } from '@/types/pathway-builder.types';
import { CARE_SETTINGS } from '../utils/constants';

interface StagePropertiesFormProps {
  stage: ApiStage;
  isReadOnly: boolean;
  onUpdate: (updates: Partial<ApiStage>) => void;
}

export function StagePropertiesForm({
  stage,
  isReadOnly,
  onUpdate,
}: StagePropertiesFormProps) {
  const [form, setForm] = useState({
    code: stage.code,
    name: stage.name,
    description: stage.description ?? '',
    stageType: stage.stageType,
    careSetting: stage.careSetting,
    expectedDurationDays: stage.expectedDurationDays ?? '',
    minDurationDays: stage.minDurationDays ?? '',
    autoTransition: stage.autoTransition,
  });

  useEffect(() => {
    setForm({
      code: stage.code,
      name: stage.name,
      description: stage.description ?? '',
      stageType: stage.stageType,
      careSetting: stage.careSetting,
      expectedDurationDays: stage.expectedDurationDays ?? '',
      minDurationDays: stage.minDurationDays ?? '',
      autoTransition: stage.autoTransition,
    });
  }, [stage.id]);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    const updates: any = { [field]: value };
    if (field === 'expectedDurationDays' || field === 'minDurationDays') {
      updates[field] = value === '' ? null : Number(value);
    }
    onUpdate(updates);
  };

  const inputCls =
    'w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400';
  const labelCls = 'block text-xs font-medium text-slate-500 mb-1';

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Code</label>
          <input
            className={inputCls}
            value={form.code}
            onChange={(e) => handleChange('code', e.target.value)}
            disabled={isReadOnly}
          />
        </div>
        <div>
          <label className={labelCls}>Stage Type</label>
          <select
            className={inputCls}
            value={form.stageType}
            onChange={(e) => handleChange('stageType', e.target.value)}
            disabled={isReadOnly}
          >
            <option value="entry">Entry</option>
            <option value="intermediate">Intermediate</option>
            <option value="decision">Decision</option>
            <option value="terminal">Terminal</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Name</label>
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div>
        <label className={labelCls}>Care Setting</label>
        <select
          className={inputCls}
          value={form.careSetting}
          onChange={(e) => handleChange('careSetting', e.target.value)}
          disabled={isReadOnly}
        >
          {CARE_SETTINGS.map((cs) => (
            <option key={cs.value} value={cs.value}>
              {cs.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Expected Duration (days)</label>
          <input
            type="number"
            className={inputCls}
            value={form.expectedDurationDays}
            onChange={(e) => handleChange('expectedDurationDays', e.target.value)}
            disabled={isReadOnly}
            min={0}
          />
        </div>
        <div>
          <label className={labelCls}>Min Duration (days)</label>
          <input
            type="number"
            className={inputCls}
            value={form.minDurationDays}
            onChange={(e) => handleChange('minDurationDays', e.target.value)}
            disabled={isReadOnly}
            min={0}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="autoTransition"
          checked={form.autoTransition}
          onChange={(e) => handleChange('autoTransition', e.target.checked)}
          disabled={isReadOnly}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="autoTransition" className="text-sm text-slate-600">
          Auto-transition when conditions are met
        </label>
      </div>
    </div>
  );
}
