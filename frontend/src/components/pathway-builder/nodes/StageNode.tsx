'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { StageNodeData } from '@/types/pathway-builder.types';
import { STAGE_TYPE_CONFIG } from '../utils/constants';
import {
  Clock,
  Layers,
  PlayCircle,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';

const STAGE_ICONS: Record<string, any> = {
  entry: PlayCircle,
  intermediate: Layers,
  decision: GitBranch,
  terminal: CheckCircle2,
};

function StageNodeComponent({ data, selected }: NodeProps<Node<StageNodeData, 'stage'>>) {
  const { stage, interventionCount } = data;
  const stageType = (stage.stageType || 'intermediate').toLowerCase();
  const config = STAGE_TYPE_CONFIG[stageType as keyof typeof STAGE_TYPE_CONFIG] || STAGE_TYPE_CONFIG.intermediate;
  const Icon = STAGE_ICONS[stageType] || Layers;

  return (
    <>
      {/* Target handle (top) */}
      {stage.stageType !== 'entry' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3.5 !h-3.5 !bg-muted !border-2 !border-background hover:!bg-primary transition-colors"
        />
      )}

      <div
        className={`
          w-[260px] bg-card rounded-xl border-l-4 shadow-sm border-border overflow-hidden
          ${config.border}
          ${selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}
          transition-all cursor-pointer
        `}
      >
        {/* Header */}
        <div className="px-3.5 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="font-bold text-sm text-foreground truncate flex-1">
              {stage.name}
            </span>
            <span
              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm ${config.bg} ${config.color}`}
            >
              {config.label}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/50 font-mono tracking-tighter">{stage.code}</span>
        </div>

        {/* Body */}
        <div className="px-3.5 py-2.5 flex items-center gap-3 text-[11px] text-muted-foreground font-bold uppercase tracking-tighter">
          {stage.expectedDurationDays != null && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 opacity-60" />
              {stage.expectedDurationDays}d
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 opacity-60" />
            {interventionCount} Intv
          </span>
          {stage.autoTransition && (
            <span className="ml-auto text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">
              Auto
            </span>
          )}
        </div>
      </div>

      {/* Source handles */}
      {stage.stageType === 'decision' ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="left"
            style={{ left: '30%' }}
            className="!w-3.5 !h-3.5 !bg-amber-500 !border-2 !border-background hover:!bg-amber-600 transition-colors"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="right"
            style={{ left: '70%' }}
            className="!w-3.5 !h-3.5 !bg-amber-500 !border-2 !border-background hover:!bg-amber-600 transition-colors"
          />
        </>
      ) : stage.stageType !== 'terminal' ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3.5 !h-3.5 !bg-primary !border-2 !border-background hover:!bg-primary/80 transition-colors"
        />
      ) : null}
    </>
  );
}

export const StageNode = memo(StageNodeComponent);
