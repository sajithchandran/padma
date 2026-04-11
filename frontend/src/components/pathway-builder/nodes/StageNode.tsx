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
  const config = STAGE_TYPE_CONFIG[stage.stageType];
  const Icon = STAGE_ICONS[stage.stageType] || Layers;

  return (
    <>
      {/* Target handle (top) */}
      {stage.stageType !== 'entry' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white hover:!bg-blue-400 transition-colors"
        />
      )}

      <div
        className={`
          w-[260px] bg-white rounded-lg border-l-4 shadow-sm
          ${config.border}
          ${selected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}
          transition-shadow cursor-pointer
        `}
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="font-semibold text-sm text-slate-800 truncate flex-1">
              {stage.name}
            </span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}
            >
              {config.label}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{stage.code}</span>
        </div>

        {/* Body */}
        <div className="px-3 py-2 flex items-center gap-3 text-xs text-slate-500">
          {stage.expectedDurationDays != null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {stage.expectedDurationDays}d
            </span>
          )}
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {interventionCount} intervention{interventionCount !== 1 ? 's' : ''}
          </span>
          {stage.autoTransition && (
            <span className="ml-auto text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
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
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white hover:!bg-amber-500 transition-colors"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="right"
            style={{ left: '70%' }}
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white hover:!bg-amber-500 transition-colors"
          />
        </>
      ) : stage.stageType !== 'terminal' ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white hover:!bg-blue-400 transition-colors"
        />
      ) : null}
    </>
  );
}

export const StageNode = memo(StageNodeComponent);
