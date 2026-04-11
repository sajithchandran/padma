'use client';

import { useState } from 'react';
import { X, Trash2, Settings, Layers } from 'lucide-react';
import type { ApiStage } from '@/types/pathway-builder.types';
import { STAGE_TYPE_CONFIG } from '../utils/constants';
import { StagePropertiesForm } from './StagePropertiesForm';
import { InterventionList } from './InterventionList';

interface StagePanelProps {
  stage: ApiStage;
  isReadOnly: boolean;
  onClose: () => void;
  onUpdate: (stageId: string, updates: Partial<ApiStage>) => void;
  onDelete: (stageId: string) => void;
}

type Tab = 'properties' | 'interventions';

export function StagePanel({
  stage,
  isReadOnly,
  onClose,
  onUpdate,
  onDelete,
}: StagePanelProps) {
  const [tab, setTab] = useState<Tab>('properties');
  const config = STAGE_TYPE_CONFIG[stage.stageType];

  return (
    <div className="w-[400px] h-full bg-card border-l border-border flex flex-col shrink-0 shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}
            >
              {config.label}
            </span>
            <span className="font-semibold text-sm text-foreground truncate">
              {stage.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!isReadOnly && (
              <button
                onClick={() => onDelete(stage.id)}
                className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                title="Delete stage"
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
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider py-3 transition-colors ${
            tab === 'properties'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('properties')}
        >
          <Settings className="w-3.5 h-3.5" />
          Properties
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider py-3 transition-colors ${
            tab === 'interventions'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('interventions')}
        >
          <Layers className="w-3.5 h-3.5" />
          Interventions
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tab === 'properties' ? (
          <StagePropertiesForm
            stage={stage}
            isReadOnly={isReadOnly}
            onUpdate={(updates) => onUpdate(stage.id, updates)}
          />
        ) : (
          <InterventionList stageId={stage.id} isReadOnly={isReadOnly} />
        )}
      </div>
    </div>
  );
}
