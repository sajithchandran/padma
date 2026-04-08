import type { Node, Edge } from '@xyflow/react';
import type {
  ApiPathway,
  ApiStage,
  ApiTransition,
  StageNodeData,
  TransitionEdgeData,
} from '@/types/pathway-builder.types';
import { CANVAS_CONFIG } from './constants';

// ─── API → React Flow ───────────────────────────────────────────────────────

function stagePosition(
  stage: ApiStage,
  index: number,
): { x: number; y: number } {
  // Use stored position from metadata if available
  const meta = stage.metadata as Record<string, any> | null;
  if (meta?.position?.x != null && meta?.position?.y != null) {
    return { x: meta.position.x, y: meta.position.y };
  }
  // Fallback: horizontal layout based on sortOrder
  const col = stage.sortOrder ?? index;
  return {
    x: 80 + col * (CANVAS_CONFIG.nodeWidth + 80),
    y: 100 + (index % 2) * 40, // slight vertical stagger
  };
}

export function stageToNode(stage: ApiStage, index: number): Node<StageNodeData> {
  return {
    id: stage.id,
    type: 'stage',
    position: stagePosition(stage, index),
    data: {
      stage,
      interventionCount: stage.interventionTemplates?.length ?? 0,
      isSelected: false,
      isReadOnly: false,
    },
  };
}

export function transitionToEdge(t: ApiTransition): Edge<TransitionEdgeData> {
  return {
    id: t.id,
    source: t.fromStageId,
    target: t.toStageId,
    type: 'transition',
    data: {
      transition: t,
      isSelected: false,
      isReadOnly: false,
    },
  };
}

export function pathwayToFlow(pathway: ApiPathway) {
  const nodes: Node<StageNodeData>[] = (pathway.stages ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s, i) => stageToNode(s, i));

  const edges: Edge<TransitionEdgeData>[] = (pathway.transitions ?? []).map(transitionToEdge);

  return { nodes, edges };
}

// ─── Diff helpers (for save) ────────────────────────────────────────────────

export interface StageDiff {
  created: ApiStage[];
  updated: ApiStage[];
  deleted: string[];
}

export interface TransitionDiff {
  created: ApiTransition[];
  updated: ApiTransition[];
  deleted: string[];
}

export function diffStages(
  current: ApiStage[],
  snapshot: ApiStage[],
): StageDiff {
  const snapMap = new Map(snapshot.map((s) => [s.id, s]));
  const currMap = new Map(current.map((s) => [s.id, s]));

  const created = current.filter((s) => s.id.startsWith('temp_'));
  const deleted = snapshot
    .filter((s) => !currMap.has(s.id))
    .map((s) => s.id);

  const updated = current.filter((s) => {
    if (s.id.startsWith('temp_')) return false;
    const prev = snapMap.get(s.id);
    if (!prev) return false;
    return JSON.stringify(s) !== JSON.stringify(prev);
  });

  return { created, updated, deleted };
}

export function diffTransitions(
  current: ApiTransition[],
  snapshot: ApiTransition[],
): TransitionDiff {
  const snapMap = new Map(snapshot.map((t) => [t.id, t]));
  const currMap = new Map(current.map((t) => [t.id, t]));

  const created = current.filter((t) => t.id.startsWith('temp_'));
  const deleted = snapshot
    .filter((t) => !currMap.has(t.id))
    .map((t) => t.id);

  const updated = current.filter((t) => {
    if (t.id.startsWith('temp_')) return false;
    const prev = snapMap.get(t.id);
    if (!prev) return false;
    return JSON.stringify(t) !== JSON.stringify(prev);
  });

  return { created, updated, deleted };
}
