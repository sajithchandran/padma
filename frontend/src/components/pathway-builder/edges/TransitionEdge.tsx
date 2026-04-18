'use client';

import { memo } from 'react';
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import type { TransitionEdgeData } from '@/types/pathway-builder.types';
import { cn } from '@/lib/utils';
import { TRIGGER_TYPE_CONFIG } from '../utils/constants';

function TransitionEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<Edge<TransitionEdgeData, 'transition'>>) {
  const transition = data?.transition;
  const triggerType = (transition?.triggerType || 'manual').toLowerCase();
  const triggerConfig = TRIGGER_TYPE_CONFIG[triggerType as keyof typeof TRIGGER_TYPE_CONFIG] || TRIGGER_TYPE_CONFIG.manual;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const strokeColor = triggerConfig.stroke;
  const isAutomatic = transition?.isAutomatic;
  const isPatientCompleted = data?.patientState === 'completed';
  const isPatientAvailable = data?.patientState === 'available';
  const patientStroke = isPatientCompleted ? '#10b981' : isPatientAvailable ? '#2563eb' : strokeColor;
  const strokeWidth = selected || isPatientCompleted || isPatientAvailable ? 4 : 3;
  const opacity = isPatientCompleted || isPatientAvailable ? 1 : selected ? 1 : 0.78;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: selected ? 'var(--primary)' : patientStroke,
          strokeWidth,
          fill: 'none',
          strokeDasharray: isAutomatic || isPatientAvailable ? '12 10' : undefined,
          transition: 'all 0.3s ease',
          opacity,
        }}
        markerEnd="url(#arrowhead)"
      />
      {/* Animated overlay for automatic transitions */}
      {isAutomatic && (
        <path
          d={edgePath}
          style={{
            stroke: '#3b82f6', // Vibrant blue for flow
            strokeWidth: selected ? 4 : 3,
            fill: 'none',
            strokeDasharray: '12 10',
            animation: 'dashdraw 0.6s linear infinite',
            opacity: selected ? 1 : 0.9,
          }}
        />
      )}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={cn(
            "group/edge px-4 py-1.5 rounded-full border shadow-lg transition-all duration-300 cursor-pointer",
            "bg-card/80 dark:bg-slate-900/80 backdrop-blur-md",
            selected 
              ? "border-primary/50 ring-4 ring-primary/20 scale-110 shadow-primary/10" 
              : isPatientCompleted
                ? "border-emerald-500/40 ring-2 ring-emerald-500/10"
                : isPatientAvailable
                  ? "border-primary/40 ring-2 ring-primary/10"
                  : "border-border/50 hover:border-primary/30 hover:scale-105"
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", triggerConfig.color)} />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap",
              selected ? "text-foreground" : "text-muted-foreground group-hover/edge:text-foreground"
            )}>
              {transition?.ruleName || 'Transition'}
            </span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const TransitionEdge = memo(TransitionEdgeComponent);
