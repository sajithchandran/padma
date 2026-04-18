'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { StageNodeData } from '@/types/pathway-builder.types';
import { cn } from '@/lib/utils';
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
  const isCurrentPatientStage = data.patientState === 'current';
  const isVisitedPatientStage = data.patientState === 'visited';

  return (
    <>
      {/* Target handle (top) */}
      {stage.stageType !== 'entry' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted !border-[1.5px] !border-border hover:!bg-primary transition-all duration-300 opacity-0 group-hover:opacity-100"
        />
      )}

      <div
        className={cn(
          "group/node relative w-[280px] rounded-2xl border transition-all duration-500 cursor-pointer overflow-hidden",
          "bg-card/90 dark:bg-slate-900/60 backdrop-blur-xl",
          selected || isCurrentPatientStage
            ? "border-primary shadow-[0_0_28px_rgba(var(--primary),0.32)] ring-4 ring-primary/20 scale-[1.03]" 
            : "border-border dark:border-border/50 hover:border-primary/40 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-0.5",
          isCurrentPatientStage && "animate-pulse",
          isVisitedPatientStage && "border-emerald-400/80 ring-2 ring-emerald-500/15"
        )}
      >
        {isCurrentPatientStage && (
          <>
            <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl border-2 border-primary/70 animate-ping" />
            <div className="absolute right-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-primary-foreground shadow-lg shadow-primary/20 animate-pulse">
              Current
            </div>
          </>
        )}
        {isVisitedPatientStage && (
          <div className="absolute right-3 top-3 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-emerald-500/15">
            Visited
          </div>
        )}

        {/* Accent Bar (Top line based on Stage Type) */}
        <div className={cn(
          "h-1.5 w-full",
          isCurrentPatientStage ? "bg-primary" : isVisitedPatientStage ? "bg-emerald-500" : config.border.replace('border-l-', 'bg-')
        )} />

        {/* Header Area */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className={cn(
              "p-2 rounded-xl transition-colors duration-300",
              config.bg.replace('bg-', 'bg-opacity-10 bg-')
            )}>
              <Icon className={cn("w-4.5 h-4.5", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-foreground tracking-tight truncate leading-none mb-1">
                {stage.name}
              </h4>
              <p className="text-[10px] text-muted-foreground/60 font-mono tracking-wider uppercase">{stage.code}</p>
            </div>
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest border uppercase transition-all duration-300",
              config.bg.replace('bg-', 'bg-opacity-5 bg-'),
              config.color,
              config.border.replace('border-l-', 'border-')
            )}>
              {config.label}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-4 py-3 bg-muted/5 border-t border-border/10">
          <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-tight">
            {stage.expectedDurationDays != null && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/10 transition-colors">
                <Clock className="w-3.5 h-3.5 opacity-50 text-indigo-500" />
                <span>{stage.expectedDurationDays} Days</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/10 transition-colors">
              <Layers className="w-3.5 h-3.5 opacity-50 text-emerald-500" />
              <span>{interventionCount} Intv</span>
            </div>
            {stage.autoTransition && (
              <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                <GitBranch className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase">Auto</span>
              </div>
            )}
          </div>
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
            className="!w-3 !h-3 !bg-amber-500 !border-[1.5px] !border-background hover:!bg-amber-600 transition-all duration-300 opacity-0 group-hover:opacity-100"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="right"
            style={{ left: '70%' }}
            className="!w-3 !h-3 !bg-amber-500 !border-[1.5px] !border-background hover:!bg-amber-600 transition-all duration-300 opacity-0 group-hover:opacity-100"
          />
        </>
      ) : stage.stageType !== 'terminal' ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-primary !border-[1.5px] !border-background hover:!bg-primary/80 transition-all duration-300 opacity-0 group-hover:opacity-100"
        />
      ) : null}
    </>
  );
}

export const StageNode = memo(StageNodeComponent);
