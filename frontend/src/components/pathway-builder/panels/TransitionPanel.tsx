'use client';

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { ApiTransition } from '@/types/pathway-builder.types';
import { TRIGGER_TYPE_CONFIG } from '../utils/constants';

interface TransitionPanelProps {
  transition: ApiTransition;
  isReadOnly: boolean;
  onClose: () => void;
  onUpdate: (transitionId: string, updates: Partial<ApiTransition>) => void;
  onDelete: (transitionId: string) => void;
}

export function TransitionPanel({
  transition,
  isReadOnly,
  onClose,
  onUpdate,
  onDelete,
}: TransitionPanelProps) {
  const [form, setForm] = useState({
    ruleName: transition.ruleName,
    ruleDescription: transition.ruleDescription ?? '',
    triggerType: transition.triggerType,
    conditionExpr: JSON.stringify(transition.conditionExpr ?? {}, null, 2),
    priority: transition.priority,
    isAutomatic: transition.isAutomatic,
    isActive: transition.isActive,
  });
  const [conditionError, setConditionError] = useState('');

  useEffect(() => {
    setForm({
      ruleName: transition.ruleName,
      ruleDescription: transition.ruleDescription ?? '',
      triggerType: transition.triggerType,
      conditionExpr: JSON.stringify(transition.conditionExpr ?? {}, null, 2),
      priority: transition.priority,
      isAutomatic: transition.isAutomatic,
      isActive: transition.isActive,
    });
    setConditionError('');
  }, [transition.id]);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === 'conditionExpr') {
      try {
        JSON.parse(value);
        setConditionError('');
        onUpdate(transition.id, { conditionExpr: JSON.parse(value) });
      } catch {
        setConditionError('Invalid JSON');
      }
      return;
    }

    onUpdate(transition.id, { [field]: value } as any);
  };

  const triggerConfig = TRIGGER_TYPE_CONFIG[transition.triggerType];
  const fromName = transition.fromStage?.name ?? transition.fromStageId.slice(0, 8);
  const toName = transition.toStage?.name ?? transition.toStageId.slice(0, 8);

  const inputCls =
    'w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400';
  const labelCls = 'block text-xs font-medium text-slate-500 mb-1';

  return (
    <div className="w-[400px] h-full bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm text-slate-800">Transition Rule</span>
          <div className="flex items-center gap-1">
            {!isReadOnly && (
              <button
                onClick={() => onDelete(transition.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                title="Delete transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-medium text-slate-600">{fromName}</span>
          <span className="text-slate-300">&rarr;</span>
          <span className="font-medium text-slate-600">{toName}</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className={labelCls}>Rule Name</label>
          <input
            className={inputCls}
            value={form.ruleName}
            onChange={(e) => handleChange('ruleName', e.target.value)}
            disabled={isReadOnly}
          />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={2}
            value={form.ruleDescription}
            onChange={(e) => handleChange('ruleDescription', e.target.value)}
            disabled={isReadOnly}
          />
        </div>

        <div>
          <label className={labelCls}>Trigger Type</label>
          <select
            className={inputCls}
            value={form.triggerType}
            onChange={(e) => handleChange('triggerType', e.target.value)}
            disabled={isReadOnly}
          >
            {Object.entries(TRIGGER_TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Condition Expression (JSON)</label>
          <textarea
            className={`${inputCls} font-mono text-xs resize-none ${conditionError ? 'border-red-300 focus:ring-red-500' : ''}`}
            rows={5}
            value={form.conditionExpr}
            onChange={(e) => handleChange('conditionExpr', e.target.value)}
            disabled={isReadOnly}
          />
          {conditionError && (
            <span className="text-[10px] text-red-500 mt-0.5">{conditionError}</span>
          )}
        </div>

        <div>
          <label className={labelCls}>Priority</label>
          <input
            type="number"
            className={inputCls}
            value={form.priority}
            onChange={(e) => handleChange('priority', Number(e.target.value))}
            disabled={isReadOnly}
            min={0}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isAutomatic}
              onChange={(e) => handleChange('isAutomatic', e.target.checked)}
              disabled={isReadOnly}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Automatic transition
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              disabled={isReadOnly}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Active
          </label>
        </div>
      </div>
    </div>
  );
}
