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
    'w-full text-sm border border-border bg-card rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:bg-muted disabled:text-muted-foreground/50 transition-all';
  const labelCls = 'block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1';

  return (
    <div className="w-[400px] h-full bg-card border-l border-border flex flex-col shrink-0 shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm text-foreground">Transition Rule</span>
          <div className="flex items-center gap-1">
            {!isReadOnly && (
              <button
                onClick={() => onDelete(transition.id)}
                className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                title="Delete transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter">
          <span className="text-foreground/70">{fromName}</span>
          <span className="text-muted-foreground/40">&rarr;</span>
          <span className="text-foreground/70">{toName}</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
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
            className={`${inputCls} font-mono text-[11px] resize-none ${conditionError ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
            rows={5}
            value={form.conditionExpr}
            onChange={(e) => handleChange('conditionExpr', e.target.value)}
            disabled={isReadOnly}
          />
          {conditionError && (
            <span className="text-[10px] text-red-500 mt-0.5 ml-1 font-bold">{conditionError}</span>
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

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 text-xs font-bold text-foreground cursor-pointer group">
            <input
              type="checkbox"
              checked={form.isAutomatic}
              onChange={(e) => handleChange('isAutomatic', e.target.checked)}
              disabled={isReadOnly}
              className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary/30 transition-all cursor-pointer"
            />
            Automatic transition
          </label>
          <label className="flex items-center gap-3 text-xs font-bold text-foreground cursor-pointer group">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              disabled={isReadOnly}
              className="w-4 h-4 rounded border-border bg-muted text-emerald-500 focus:ring-emerald-500/30 transition-all cursor-pointer"
            />
            Active
          </label>
        </div>
      </div>
    </div>
  );
}
