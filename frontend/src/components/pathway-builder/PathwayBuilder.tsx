'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Connection, Edge, Node } from '@xyflow/react';
import { AlertCircle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

import { BuilderCanvas } from './BuilderCanvas';
import { BuilderHeader } from './BuilderHeader';
import { BuilderToolbar } from './BuilderToolbar';
import { StagePanel } from './panels/StagePanel';
import { TransitionPanel } from './panels/TransitionPanel';
import { autoLayout } from './utils/layout';
import { pathwayToFlow } from './utils/converters';
import { useBuilderStore } from '@/store/builder.store';
import type {
  ActivePanel,
  ApiPathway,
  ApiStage,
  ApiTransition,
  StageNodeData,
  TransitionEdgeData,
} from '@/types/pathway-builder.types';
import {
  createStage,
  createPathway,
  createTransition,
  deleteStage,
  deleteTransition,
  fetchPathway,
  fetchStages,
  fetchTransitions,
  publishPathway,
  reorderStages,
  updateStage,
  updateTransition,
} from '@/services/pathway.service';
import { fetchNamedCareTeams, type ApiNamedCareTeam } from '@/services/care-team.service';
import { fetchCurrentTenant } from '@/services/tenants.service';

interface PathwayBuilderProps {
  pathwayId: string;
}

const PATHWAY_CATEGORIES = [
  'diabetes',
  'hypertension',
  'cardiac',
  'rehab',
  'respiratory',
  'oncology',
  'wellness',
  'custom',
] as const;

const PATHWAY_SETTINGS = ['outpatient', 'inpatient', 'home_care'] as const;

type StageUpdatePayload = Partial<{
  code: string;
  name: string;
  description: string | null;
  stageType: string;
  careSetting: string;
  sortOrder: number;
  expectedDurationDays: number | null;
  minDurationDays: number | null;
  autoTransition: boolean;
  entryActions: any;
  exitActions: any;
  metadata: Record<string, any>;
}>;

type TransitionUpdatePayload = Partial<{
  ruleName: string;
  ruleDescription: string | null;
  triggerType: string;
  conditionExpr: Record<string, any>;
  priority: number;
  isAutomatic: boolean;
  isActive: boolean;
}>;

function normalizeStageForSave(stage: ApiStage): StageUpdatePayload {
  return {
    code: stage.code,
    name: stage.name,
    description: stage.description ?? null,
    stageType: stage.stageType,
    careSetting: stage.careSetting,
    sortOrder: stage.sortOrder,
    expectedDurationDays: stage.expectedDurationDays ?? null,
    minDurationDays: stage.minDurationDays ?? null,
    autoTransition: stage.autoTransition,
    entryActions: stage.entryActions ?? null,
    exitActions: stage.exitActions ?? null,
    metadata: stage.metadata ?? undefined,
  };
}

function normalizeTransitionForSave(transition: ApiTransition): TransitionUpdatePayload {
  return {
    ruleName: transition.ruleName,
    ruleDescription: transition.ruleDescription ?? null,
    triggerType: transition.triggerType,
    conditionExpr: transition.conditionExpr ?? {},
    priority: transition.priority,
    isAutomatic: transition.isAutomatic,
    isActive: transition.isActive,
  };
}

function withCanvasPositions(
  pathway: ApiPathway,
  nodes: Node<StageNodeData>[],
): ApiPathway {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return {
    ...pathway,
    stages: pathway.stages.map((stage) => {
      const node = nodeMap.get(stage.id);
      if (!node) return stage;

      return {
        ...stage,
        metadata: {
          ...(stage.metadata ?? {}),
          position: {
            x: Math.round(node.position.x),
            y: Math.round(node.position.y),
          },
        },
      };
    }),
  };
}

export function PathwayBuilder({ pathwayId }: PathwayBuilderProps) {
  const router = useRouter();
  const {
    pathway: storePathway,
    activePanel,
    isReadOnly,
    setPathway: setStorePathway,
    takeSnapshot,
    setActivePanel,
    markDirty,
    markClean,
    setSaving,
    setPublishing,
    reset,
  } = useBuilderStore();

  const [pathway, setPathway] = useState<ApiPathway | null>(null);
  const [nodes, setNodes] = useState<Node<StageNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge<TransitionEdgeData>[]>([]);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [creatingPathway, setCreatingPathway] = useState(false);
  const [createPathwayError, setCreatePathwayError] = useState<string | null>(null);
  const [newPathwayForm, setNewPathwayForm] = useState({
    name: '',
    description: '',
    category: 'custom',
    defaultDurationDays: '90',
    applicableSettings: ['outpatient'] as string[],
    careTeamId: '',
  });
  const [careTeams, setCareTeams] = useState<ApiNamedCareTeam[]>([]);
  const [pathwayCodeFormat, setPathwayCodeFormat] = useState('PW-{YYYY}-{SEQ4}');
  const nodesRef = useRef<Node<StageNodeData>[]>([]);
  const edgesRef = useRef<Edge<TransitionEdgeData>[]>([]);

  const snapshot = useBuilderStore((state) => state.snapshot);
  const isSaving = useBuilderStore((state) => state.isSaving);
  const isPublishing = useBuilderStore((state) => state.isPublishing);

  const isCreateMode = pathwayId === 'new';

  const syncPathway = useCallback(
    (next: ApiPathway, options?: { dirty?: boolean; resetPanel?: boolean }) => {
      setPathway(next);
      setStorePathway(next);
      if (options?.dirty) {
        markDirty();
      }
      if (options?.resetPanel) {
        setActivePanel(null);
      }
    },
    [markDirty, setActivePanel, setStorePathway],
  );

  const rebuildFlow = useCallback((nextPathway: ApiPathway) => {
    const flow = pathwayToFlow(nextPathway);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    nodesRef.current = flow.nodes;
    edgesRef.current = flow.edges;
    setCanvasVersion((value) => value + 1);
  }, []);

  const load = useCallback(async () => {
    if (isCreateMode) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [basePathway, stages, transitions] = await Promise.all([
        fetchPathway(pathwayId),
        fetchStages(pathwayId),
        fetchTransitions(pathwayId),
      ]);

      const fullPathway: ApiPathway = {
        ...basePathway,
        stages,
        transitions,
      };

      syncPathway(fullPathway);
      rebuildFlow(fullPathway);
      takeSnapshot();
      markClean();
      setSaveError(null);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message ?? 'Failed to load pathway builder.');
    } finally {
      setLoading(false);
    }
  }, [isCreateMode, markClean, pathwayId, rebuildFlow, syncPathway, takeSnapshot]);

  useEffect(() => {
    load();
    return () => reset();
  }, [load, reset]);

  useEffect(() => {
    fetchNamedCareTeams()
      .then(setCareTeams)
      .catch(() => setCareTeams([]));
    fetchCurrentTenant()
      .then((tenant) => {
        const configuredFormat = tenant.featureFlags?.pathwayCodeFormat;
        if (typeof configuredFormat === 'string' && configuredFormat.trim()) {
          setPathwayCodeFormat(configuredFormat);
        }
      })
      .catch(() => {});
  }, []);

  const createFormValid =
    newPathwayForm.name.trim() &&
    newPathwayForm.category &&
    Number(newPathwayForm.defaultDurationDays) > 0 &&
    newPathwayForm.applicableSettings.length > 0;

  const handleCreatePathwayFromBuilder = useCallback(async () => {
    if (!createFormValid || creatingPathway) return;

    setCreatingPathway(true);
    setCreatePathwayError(null);

    try {
      const created = await createPathway({
        name: newPathwayForm.name.trim(),
        description: newPathwayForm.description.trim() || undefined,
        category: newPathwayForm.category,
        defaultDurationDays: Number(newPathwayForm.defaultDurationDays),
        applicableSettings: newPathwayForm.applicableSettings,
        careTeamId: newPathwayForm.careTeamId || undefined,
      });
      router.replace(`/pathways/${created.id}/builder`);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setCreatePathwayError(
        Array.isArray(message) ? message.join(', ') : message ?? 'Failed to create pathway draft.',
      );
    } finally {
      setCreatingPathway(false);
    }
  }, [createFormValid, creatingPathway, newPathwayForm, router]);

  const selectedStage = useMemo(() => {
    if (!pathway || activePanel?.type !== 'stage') return null;
    return pathway.stages.find((stage) => stage.id === activePanel.id) ?? null;
  }, [activePanel, pathway]);

  const selectedTransition = useMemo(() => {
    if (!pathway || activePanel?.type !== 'transition') return null;
    return pathway.transitions.find((transition) => transition.id === activePanel.id) ?? null;
  }, [activePanel, pathway]);

  const handleStageUpdate = useCallback(
    (stageId: string, updates: Partial<ApiStage>) => {
      if (!pathway) return;

      const next: ApiPathway = {
        ...pathway,
        stages: pathway.stages.map((stage) =>
          stage.id === stageId ? { ...stage, ...updates } : stage,
        ),
      };

      syncPathway(next, { dirty: true });
      rebuildFlow(withCanvasPositions(next, nodesRef.current));
    },
    [pathway, rebuildFlow, syncPathway],
  );

  const handleDeleteStage = useCallback(
    (stageId: string) => {
      if (!pathway || isReadOnly) return;
      if (!window.confirm('Delete this stage and its connected transitions?')) return;

      const remainingStages = pathway.stages
        .filter((stage) => stage.id !== stageId)
        .map((stage, index) => ({ ...stage, sortOrder: index + 1 }));
      const remainingTransitions = pathway.transitions.filter(
        (transition) => transition.fromStageId !== stageId && transition.toStageId !== stageId,
      );

      const next: ApiPathway = {
        ...pathway,
        stages: remainingStages,
        transitions: remainingTransitions,
      };

      syncPathway(next, { dirty: true, resetPanel: true });
      rebuildFlow(withCanvasPositions(next, nodesRef.current.filter((node) => node.id !== stageId)));
    },
    [isReadOnly, pathway, rebuildFlow, syncPathway],
  );

  const handleTransitionUpdate = useCallback(
    (transitionId: string, updates: Partial<ApiTransition>) => {
      if (!pathway) return;

      const next: ApiPathway = {
        ...pathway,
        transitions: pathway.transitions.map((transition) =>
          transition.id === transitionId ? { ...transition, ...updates } : transition,
        ),
      };

      syncPathway(next, { dirty: true });
      rebuildFlow(withCanvasPositions(next, nodesRef.current));
    },
    [pathway, rebuildFlow, syncPathway],
  );

  const handleDeleteTransition = useCallback(
    (transitionId: string) => {
      if (!pathway || isReadOnly) return;
      if (!window.confirm('Delete this transition?')) return;

      const next: ApiPathway = {
        ...pathway,
        transitions: pathway.transitions.filter((transition) => transition.id !== transitionId),
      };

      syncPathway(next, { dirty: true, resetPanel: true });
      rebuildFlow(withCanvasPositions(next, nodesRef.current));
    },
    [isReadOnly, pathway, rebuildFlow, syncPathway],
  );

  const handleAddStage = useCallback(() => {
    if (!pathway || isReadOnly) return;

    const tempId = `temp_stage_${Date.now()}`;
    const sortOrder = pathway.stages.length + 1;
    const lastNode = nodesRef.current[nodesRef.current.length - 1];
    const nextStage: ApiStage = {
      id: tempId,
      tenantId: pathway.tenantId,
      pathwayId: pathway.id,
      code: `STAGE_${sortOrder}`,
      name: `New Stage ${sortOrder}`,
      description: null,
      stageType: 'intermediate',
      careSetting: 'any',
      sortOrder,
      expectedDurationDays: null,
      minDurationDays: null,
      autoTransition: false,
      entryActions: null,
      exitActions: null,
      metadata: {
        position: {
          x: lastNode ? lastNode.position.x + 340 : 120,
          y: lastNode ? lastNode.position.y : 140,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      interventionTemplates: [],
      transitionsFrom: [],
      transitionsTo: [],
      _count: { currentEnrollments: 0 },
    };

    const next: ApiPathway = {
      ...pathway,
      stages: [...pathway.stages, nextStage],
    };

    syncPathway(next, { dirty: true });
    rebuildFlow(next);
    setActivePanel({ type: 'stage', id: tempId });
  }, [isReadOnly, pathway, rebuildFlow, setActivePanel, syncPathway]);

  const handleAutoLayout = useCallback(async () => {
    if (!pathway) return;

    const layouted = await autoLayout(nodesRef.current, edgesRef.current);
    setNodes(layouted);
    nodesRef.current = layouted;

    const next = withCanvasPositions(pathway, layouted);
    syncPathway(next, { dirty: true });
    setCanvasVersion((value) => value + 1);
  }, [pathway, syncPathway]);

  const handleNodeSelect = useCallback(
    (nodeId: string | null) => {
      setActivePanel(nodeId ? ({ type: 'stage', id: nodeId } satisfies ActivePanel) : null);
    },
    [setActivePanel],
  );

  const handleEdgeSelect = useCallback(
    (edgeId: string | null) => {
      setActivePanel(edgeId ? ({ type: 'transition', id: edgeId } satisfies ActivePanel) : null);
    },
    [setActivePanel],
  );

  const handleNewConnection = useCallback(
    (connection: Connection) => {
      if (!pathway || !connection.source || !connection.target || isReadOnly) return;

      const tempId = `temp_transition_${Date.now()}`;
      const nextTransition: ApiTransition = {
        id: tempId,
        tenantId: pathway.tenantId,
        pathwayId: pathway.id,
        fromStageId: connection.source,
        toStageId: connection.target,
        ruleName: 'New Transition',
        ruleDescription: null,
        triggerType: 'manual',
        conditionExpr: {},
        priority: pathway.transitions.length + 1,
        isAutomatic: false,
        isActive: true,
        transitionActions: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fromStage: pathway.stages.find((stage) => stage.id === connection.source)
          ? {
              id: connection.source,
              name:
                pathway.stages.find((stage) => stage.id === connection.source)?.name ?? connection.source,
              code:
                pathway.stages.find((stage) => stage.id === connection.source)?.code ?? connection.source,
              stageType:
                pathway.stages.find((stage) => stage.id === connection.source)?.stageType ?? 'intermediate',
            }
          : undefined,
        toStage: pathway.stages.find((stage) => stage.id === connection.target)
          ? {
              id: connection.target,
              name:
                pathway.stages.find((stage) => stage.id === connection.target)?.name ?? connection.target,
              code:
                pathway.stages.find((stage) => stage.id === connection.target)?.code ?? connection.target,
              stageType:
                pathway.stages.find((stage) => stage.id === connection.target)?.stageType ?? 'intermediate',
            }
          : undefined,
      };

      const next: ApiPathway = {
        ...pathway,
        transitions: [...pathway.transitions, nextTransition],
      };

      syncPathway(next, { dirty: true });
      rebuildFlow(withCanvasPositions(next, nodesRef.current));
      setActivePanel({ type: 'transition', id: tempId });
    },
    [isReadOnly, pathway, rebuildFlow, setActivePanel, syncPathway],
  );

  const handleNodesExternalChange = useCallback(
    (nextNodes: Node<StageNodeData>[]) => {
      if (!pathway) return;
      setNodes(nextNodes);
      nodesRef.current = nextNodes;
      const next = withCanvasPositions(pathway, nextNodes);
      syncPathway(next, { dirty: true });
    },
    [pathway, syncPathway],
  );

  const handleEdgesExternalChange = useCallback(
    (nextEdges: Edge<TransitionEdgeData>[]) => {
      if (!pathway) return;

      const remainingIds = new Set(nextEdges.map((edge) => edge.id));
      const next: ApiPathway = {
        ...pathway,
        transitions: pathway.transitions.filter((transition) => remainingIds.has(transition.id)),
      };

      syncPathway(next, {
        dirty: true,
        resetPanel:
          activePanel?.type === 'transition' &&
          !remainingIds.has(activePanel.id),
      });
    },
    [activePanel, pathway, syncPathway],
  );

  const handleSave = useCallback(async () => {
    if (!pathway || !snapshot || isReadOnly) return;

    setSaving(true);
    setSaveError(null);

    try {
      const current = withCanvasPositions(pathway, nodesRef.current);
      const stageIdMap = new Map<string, string>();
      const snapshotTransitionIds = new Set(snapshot.transitions.map((transition) => transition.id));

      const currentStagesSorted = [...current.stages].sort((a, b) => a.sortOrder - b.sortOrder);
      const createdStages = currentStagesSorted.filter((stage) => stage.id.startsWith('temp_stage_'));
      const existingStages = currentStagesSorted.filter((stage) => !stage.id.startsWith('temp_stage_'));
      const deletedStageIds = snapshot.stages
        .filter((stage) => !current.stages.some((candidate) => candidate.id === stage.id))
        .map((stage) => stage.id);

      for (const stage of createdStages) {
        const created = await createStage(current.id, {
          code: stage.code,
          name: stage.name,
          description: stage.description ?? undefined,
          stageType: stage.stageType,
          careSetting: stage.careSetting,
          sortOrder: stage.sortOrder,
          expectedDurationDays: stage.expectedDurationDays ?? undefined,
          minDurationDays: stage.minDurationDays ?? undefined,
          autoTransition: stage.autoTransition,
          entryActions: stage.entryActions ?? undefined,
          exitActions: stage.exitActions ?? undefined,
          metadata: stage.metadata ?? undefined,
        });
        stageIdMap.set(stage.id, created.id);
      }

      for (const stage of existingStages) {
        await updateStage(current.id, stage.id, normalizeStageForSave(stage));
      }

      if (current.stages.length > 0) {
        const reordered = currentStagesSorted.map((stage, index) => ({
          id: stageIdMap.get(stage.id) ?? stage.id,
          sortOrder: index + 1,
        }));
        await reorderStages(current.id, reordered);
      }

      for (const stageId of deletedStageIds) {
        await deleteStage(current.id, stageId);
      }

      const currentTransitions = current.transitions.map((transition) => ({
        ...transition,
        fromStageId: stageIdMap.get(transition.fromStageId) ?? transition.fromStageId,
        toStageId: stageIdMap.get(transition.toStageId) ?? transition.toStageId,
      }));

      const createdTransitions = currentTransitions.filter((transition) =>
        transition.id.startsWith('temp_transition_'),
      );
      const existingTransitions = currentTransitions.filter(
        (transition) => !transition.id.startsWith('temp_transition_'),
      );
      const deletedTransitionIds = snapshot.transitions
        .filter((transition) => !current.transitions.some((candidate) => candidate.id === transition.id))
        .map((transition) => transition.id);

      for (const transition of createdTransitions) {
        await createTransition(current.id, {
          fromStageId: transition.fromStageId,
          toStageId: transition.toStageId,
          ruleName: transition.ruleName,
          ruleDescription: transition.ruleDescription ?? undefined,
          triggerType: transition.triggerType,
          conditionExpr: transition.conditionExpr ?? {},
          priority: transition.priority,
          isAutomatic: transition.isAutomatic,
          isActive: transition.isActive,
        });
      }

      for (const transition of existingTransitions) {
        if (!snapshotTransitionIds.has(transition.id) && transition.id.startsWith('temp_transition_')) {
          continue;
        }
        await updateTransition(transition.id, normalizeTransitionForSave(transition));
      }

      for (const transitionId of deletedTransitionIds) {
        await deleteTransition(transitionId);
      }

      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setSaveError(Array.isArray(message) ? message.join(', ') : message ?? 'Failed to save pathway changes.');
    } finally {
      setSaving(false);
    }
  }, [isReadOnly, load, pathway, setSaving, snapshot]);

  const handlePublish = useCallback(async () => {
    if (!pathway || isReadOnly) return;

    setPublishing(true);
    setSaveError(null);

    try {
      await publishPathway(pathway.id);
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setSaveError(Array.isArray(message) ? message.join(', ') : message ?? 'Failed to publish pathway.');
    } finally {
      setPublishing(false);
    }
  }, [isReadOnly, load, pathway, setPublishing]);

  const livePathway = pathway ?? storePathway;

  if (isCreateMode) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-slate-100">
        <div className="h-14 border-b border-slate-200 bg-white px-4 flex items-center gap-4 shrink-0">
          <button
            onClick={() => router.push('/pathways')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-800">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">New Pathway Builder</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Create pathway in builder</h2>
              <p className="mt-1 text-sm text-slate-500">
                Start by creating a draft pathway. Once saved, you will land directly in the visual builder to add stages, interventions, and transitions.
              </p>
            </div>

            {createPathwayError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createPathwayError}
              </div>
            )}

            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Pathway code will be generated automatically on first save using tenant format{' '}
              <span className="font-mono font-semibold">{pathwayCodeFormat}</span>.
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Category</label>
                <select
                  value={newPathwayForm.category}
                  onChange={(e) => setNewPathwayForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {PATHWAY_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Pathway Name</label>
              <input
                value={newPathwayForm.name}
                onChange={(e) => setNewPathwayForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Heart Failure Remote Monitoring"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Description</label>
              <textarea
                value={newPathwayForm.description}
                onChange={(e) => setNewPathwayForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Optional summary of the pathway purpose and target cohort"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Default Duration (days)</label>
                <input
                  type="number"
                  min={1}
                  value={newPathwayForm.defaultDurationDays}
                  onChange={(e) => setNewPathwayForm((prev) => ({ ...prev, defaultDurationDays: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Applicable Settings</label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-2">
                  {PATHWAY_SETTINGS.map((setting) => {
                    const selected = newPathwayForm.applicableSettings.includes(setting);
                    return (
                      <button
                        key={setting}
                        type="button"
                        onClick={() =>
                          setNewPathwayForm((prev) => ({
                            ...prev,
                            applicableSettings: selected
                              ? prev.applicableSettings.filter((item) => item !== setting)
                              : [...prev.applicableSettings, setting],
                          }))
                        }
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {setting.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Default Care Team</label>
              <select
                value={newPathwayForm.careTeamId}
                onChange={(e) => setNewPathwayForm((prev) => ({ ...prev, careTeamId: e.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">No default care team</option>
                {careTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.memberCount} members)
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => router.push('/pathways')}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePathwayFromBuilder}
                disabled={!createFormValid || creatingPathway}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingPathway ? 'Creating...' : 'Create In Builder'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading pathway builder...
        </div>
      </div>
    );
  }

  if (error || !livePathway) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load pathway builder</p>
              <p className="mt-1 text-sm text-red-600">{error ?? 'Unknown error'}</p>
              <button
                onClick={load}
                className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      <BuilderHeader />
      <BuilderToolbar
        onAddStage={handleAddStage}
        onAutoLayout={handleAutoLayout}
        onSave={handleSave}
        onPublish={handlePublish}
      />

      {saveError && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {saveError}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <BuilderCanvas
          key={canvasVersion}
          initialNodes={nodes}
          initialEdges={edges}
          onNodeSelect={handleNodeSelect}
          onEdgeSelect={handleEdgeSelect}
          onNewConnection={handleNewConnection}
          onNodesChangeExternal={handleNodesExternalChange}
          onEdgesChangeExternal={handleEdgesExternalChange}
          nodesRef={nodesRef}
          edgesRef={edgesRef}
        />

        {selectedStage && (
          <StagePanel
            stage={selectedStage}
            isReadOnly={isReadOnly || isSaving || isPublishing}
            onClose={() => setActivePanel(null)}
            onUpdate={handleStageUpdate}
            onDelete={handleDeleteStage}
          />
        )}

        {selectedTransition && (
          <TransitionPanel
            transition={selectedTransition}
            isReadOnly={isReadOnly || isSaving || isPublishing}
            onClose={() => setActivePanel(null)}
            onUpdate={handleTransitionUpdate}
            onDelete={handleDeleteTransition}
          />
        )}
      </div>
    </div>
  );
}
