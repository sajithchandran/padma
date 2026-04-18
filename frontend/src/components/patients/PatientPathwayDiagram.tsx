'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, GitBranch, Loader2, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { fetchPathway, fetchStages, fetchTransitions } from '@/services/pathway.service';
import type { ApiStageHistoryItem } from '@/services/enrollments.service';
import type { StageNodeData, TransitionEdgeData } from '@/types/pathway-builder.types';
import { StageNode } from '@/components/pathway-builder/nodes/StageNode';
import { TransitionEdge } from '@/components/pathway-builder/edges/TransitionEdge';
import { pathwayToFlow } from '@/components/pathway-builder/utils/converters';

const nodeTypes = { stage: StageNode };
const edgeTypes = { transition: TransitionEdge };
const defaultEdgeOptions = {
  type: 'transition',
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
};

type PatientPathwayDiagramProps = {
  pathwayId: string;
  currentStageId: string;
  status: string;
  stageHistory: ApiStageHistoryItem[];
};

function buildVisitedStageIds(history: ApiStageHistoryItem[], currentStageId: string) {
  const visited = new Set<string>();
  history.forEach((item) => {
    if (item.fromStage?.id) visited.add(item.fromStage.id);
    if (item.toStage?.id) visited.add(item.toStage.id);
  });
  if (currentStageId) visited.add(currentStageId);
  return visited;
}

function buildCompletedTransitionIds(history: ApiStageHistoryItem[]) {
  return new Set(
    history
      .map((item) => item.transitionRule?.id)
      .filter((id): id is string => Boolean(id)),
  );
}

async function loadPatientPathwayFlow(
  pathwayId: string,
  currentStageId: string,
  visitedStageIds: Set<string>,
  completedTransitionIds: Set<string>,
) {
  const [pathway, stages, transitions] = await Promise.all([
    fetchPathway(pathwayId),
    fetchStages(pathwayId),
    fetchTransitions(pathwayId),
  ]);

  const flow = pathwayToFlow({ ...pathway, stages, transitions });
  const stagesWithPosition = stages.filter((stage) => {
    const position = stage.metadata?.position;
    return typeof position?.x === 'number' && typeof position?.y === 'number';
  }).length;

  const nodes: Node<StageNodeData>[] = flow.nodes.map((node) => {
    const isCurrent = node.id === currentStageId;
    const isVisited = visitedStageIds.has(node.id);

    return {
      ...node,
      selected: isCurrent,
      draggable: false,
      selectable: false,
      data: {
        ...node.data,
        isReadOnly: true,
        isSelected: isCurrent,
        patientState: isCurrent ? 'current' : isVisited ? 'visited' : 'upcoming',
      },
    };
  });

  const edges: Edge<TransitionEdgeData>[] = flow.edges.map((edge) => {
    const isCompleted = completedTransitionIds.has(edge.id);
    const isAvailable = edge.source === currentStageId;

    return {
      ...edge,
      selected: isCompleted,
      selectable: false,
      animated: isCompleted || isAvailable,
      data: {
        transition: edge.data!.transition,
        isReadOnly: true,
        isSelected: isCompleted,
        patientState: isCompleted ? 'completed' : isAvailable ? 'available' : 'upcoming',
      },
    };
  });

  return {
    pathway,
    nodes,
    edges,
    diagnostics: {
      stageCount: stages.length,
      transitionCount: transitions.length,
      stagesWithPosition,
    },
  };
}

import { useTheme } from 'next-themes';

export function PatientPathwayDiagram({
  pathwayId,
  currentStageId,
  status,
  stageHistory,
}: PatientPathwayDiagramProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const visitedStageIds = useMemo(
    () => buildVisitedStageIds(stageHistory, currentStageId),
    [currentStageId, stageHistory],
  );
  const completedTransitionIds = useMemo(
    () => buildCompletedTransitionIds(stageHistory),
    [stageHistory],
  );

  const diagramQuery = useQuery({
    queryKey: [
      'patient-pathway-diagram',
      pathwayId,
      currentStageId,
      Array.from(visitedStageIds).sort().join(','),
      Array.from(completedTransitionIds).sort().join(','),
    ],
    queryFn: () => loadPatientPathwayFlow(pathwayId, currentStageId, visitedStageIds, completedTransitionIds),
    enabled: Boolean(pathwayId && currentStageId),
  });

  const stageCount = diagramQuery.data?.nodes.length ?? 0;
  const transitionCount = diagramQuery.data?.edges.length ?? 0;
  const diagnostics = diagramQuery.data?.diagnostics;
  const missingPositionCount = diagnostics
    ? Math.max(diagnostics.stageCount - diagnostics.stagesWithPosition, 0)
    : 0;
  const hasGraphWarning = Boolean(diagnostics && (missingPositionCount > 0 || diagnostics.transitionCount === 0));

  return (
    <Card padding="none" className="overflow-hidden border-border/60">
      <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">Patient Pathway Map</h3>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            Read-only stage flow for this enrollment with the current stage highlighted.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-tight text-muted-foreground">
          <span className="rounded-full border border-border bg-background px-3 py-1">{status}</span>
          <span className="rounded-full border border-border bg-background px-3 py-1">{stageCount} Stages</span>
          <span className="rounded-full border border-border bg-background px-3 py-1">{transitionCount} Rules</span>
        </div>
      </div>

      <div className={cn(
        "relative h-[460px] transition-colors duration-300",
        isDark 
          ? "bg-[#0a0c10] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.1),transparent_40%)]" 
          : "bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_32%),linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.95))]"
      )}>
        {diagramQuery.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-xs font-bold text-muted-foreground shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading pathway map...
            </div>
          </div>
        ) : diagramQuery.isError ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <Route className="mx-auto mb-2 h-7 w-7 text-red-500/60" />
              <p className="text-sm font-bold text-red-600">Unable to load patient pathway diagram.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(diagramQuery.error as any)?.response?.data?.message ?? 'The pathway graph could not be loaded.'}
              </p>
            </div>
          </div>
        ) : (
          <ReactFlowProvider>
            {hasGraphWarning && (
              <div className="absolute left-4 top-4 z-10 max-w-md rounded-2xl border border-amber-500/25 bg-amber-50/95 p-3 text-amber-900 shadow-lg backdrop-blur">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide">Pathway graph data incomplete</p>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed">
                      {missingPositionCount > 0
                        ? `${missingPositionCount} stage${missingPositionCount === 1 ? '' : 's'} do not have saved builder coordinates. `
                        : ''}
                      {diagnostics?.transitionCount === 0
                        ? 'No transition rules are configured for this enrolled pathway version.'
                        : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <svg className="absolute h-0 w-0">
              <defs>
                <marker
                  id="arrowhead"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M 0 0 L 10 5 L 0 10 L 2 5 z"
                    fill="currentColor"
                    className="text-muted-foreground/70"
                  />
                </marker>
              </defs>
            </svg>

            <style>{`
              @keyframes dashdraw {
                to { stroke-dashoffset: -22; }
              }
            `}</style>

            <ReactFlow
              nodes={diagramQuery.data?.nodes ?? []}
              edges={diagramQuery.data?.edges ?? []}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              colorMode={isDark ? 'dark' : 'light'}
              fitView
              fitViewOptions={{ padding: 0.24, duration: 450 }}
              minZoom={0.25}
              maxZoom={1.5}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background color={isDark ? "rgba(255,255,255,0.05)" : "rgba(100,116,139,0.18)"} gap={22} />
              <Controls showInteractive={false} position="bottom-left" />
              <MiniMap
                position="bottom-right"
                pannable
                zoomable
                nodeColor={(node) => (node.id === currentStageId ? '#2563eb' : visitedStageIds.has(node.id) ? '#10b981' : isDark ? '#334155' : '#cbd5e1')}
                maskColor={isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.66)"}
              />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border/60 bg-background px-5 py-3 text-[10px] font-black uppercase tracking-tight text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Current stage</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Visited stage</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-6 rounded-full bg-primary" /> Available transition</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-6 rounded-full bg-emerald-500" /> Completed transition</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Upcoming stage</span>
      </div>
    </Card>
  );
}
