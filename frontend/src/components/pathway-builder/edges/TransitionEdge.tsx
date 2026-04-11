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
  const triggerConfig = transition
    ? TRIGGER_TYPE_CONFIG[transition.triggerType]
    : TRIGGER_TYPE_CONFIG.manual;

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
          stroke: selected ? '#2563eb' : strokeColor,
          strokeWidth: selected ? 2.5 : 1.8,
          fill: 'none',
          strokeDasharray: isAutomatic ? '6 4' : undefined,
        }}
        markerEnd="url(#arrowhead)"
      />
      {/* Animated overlay for automatic transitions */}
      {isAutomatic && (
        <path
          d={edgePath}
          style={{
            stroke: strokeColor,
            strokeWidth: 1.8,
            fill: 'none',
            strokeDasharray: '6 4',
            animation: 'dashdraw 0.5s linear infinite',
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
            text-[10px] font-medium px-2 py-0.5 rounded-full border shadow-sm
            bg-white cursor-pointer
            ${selected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200'}
            ${triggerConfig.color}
            hover:shadow-md transition-shadow
          `}
        >
          {transition?.ruleName || 'Transition'}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const TransitionEdge = memo(TransitionEdgeComponent);
