'use client';

import { memo } from 'react';
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import type { TransitionEdgeData } from '@/types/pathway-builder.types';
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

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: selected ? 'var(--primary)' : strokeColor,
          strokeWidth: selected ? 2.5 : 1.8,
          fill: 'none',
          strokeDasharray: isAutomatic ? '8 6' : undefined,
          transition: 'stroke 0.2s ease',
        }}
        markerEnd="url(#arrowhead)"
      />
      {/* Animated overlay for automatic transitions */}
      {isAutomatic && (
        <path
          d={edgePath}
          style={{
            stroke: selected ? 'var(--primary)' : strokeColor,
            strokeWidth: selected ? 2.5 : 1.8,
            fill: 'none',
            strokeDasharray: '8 6',
            animation: 'dashdraw 0.8s linear infinite',
            opacity: 0.8,
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
          className={`
            text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-sm
            bg-card cursor-pointer transition-all
            ${selected ? 'border-primary ring-4 ring-primary/20 scale-110' : 'border-border'}
            ${triggerConfig.color}
            hover:shadow-md hover:scale-105 active:scale-95
          `}
        >
          {transition?.ruleName || 'Transition'}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const TransitionEdge = memo(TransitionEdgeComponent);
