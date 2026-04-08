import api from '@/lib/api';
import type {
  ApiPathway,
  ApiStage,
  ApiIntervention,
  ApiTransition,
} from '@/types/pathway-builder.types';

// ─── Pathway CRUD ───────────────────────────────────────────────────────────

export async function fetchPathway(id: string): Promise<ApiPathway> {
  const { data } = await api.get(`/pathways/${id}`);
  return data;
}

export async function updatePathway(
  id: string,
  payload: Partial<Pick<ApiPathway, 'name' | 'description' | 'category' | 'defaultDurationDays' | 'applicableSettings'>>,
) {
  const { data } = await api.put(`/pathways/${id}`, payload);
  return data;
}

export async function publishPathway(id: string) {
  const { data } = await api.post(`/pathways/${id}/publish`);
  return data;
}

export async function deletePathway(id: string) {
  const { data } = await api.delete(`/pathways/${id}`);
  return data;
}

// ─── Stage CRUD ─────────────────────────────────────────────────────────────

export async function fetchStages(pathwayId: string): Promise<ApiStage[]> {
  const { data } = await api.get(`/pathways/${pathwayId}/stages`);
  return data;
}

export async function fetchStage(pathwayId: string, stageId: string): Promise<ApiStage> {
  const { data } = await api.get(`/pathways/${pathwayId}/stages/${stageId}`);
  return data;
}

export async function createStage(
  pathwayId: string,
  payload: {
    code: string;
    name: string;
    description?: string;
    stageType: string;
    careSetting: string;
    sortOrder: number;
    expectedDurationDays?: number;
    minDurationDays?: number;
    autoTransition?: boolean;
    entryActions?: any;
    exitActions?: any;
    metadata?: Record<string, any>;
  },
): Promise<ApiStage> {
  const { data } = await api.post(`/pathways/${pathwayId}/stages`, payload);
  return data;
}

export async function updateStage(
  pathwayId: string,
  stageId: string,
  payload: Partial<{
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
  }>,
): Promise<ApiStage> {
  const { data } = await api.put(`/pathways/${pathwayId}/stages/${stageId}`, payload);
  return data;
}

export async function deleteStage(pathwayId: string, stageId: string) {
  const { data } = await api.delete(`/pathways/${pathwayId}/stages/${stageId}`);
  return data;
}

export async function reorderStages(
  pathwayId: string,
  stages: { id: string; sortOrder: number }[],
) {
  const { data } = await api.patch(`/pathways/${pathwayId}/stages/reorder`, { stages });
  return data;
}

// ─── Intervention CRUD ──────────────────────────────────────────────────────

export async function fetchInterventions(stageId: string): Promise<ApiIntervention[]> {
  const { data } = await api.get(`/pathways/stages/${stageId}/interventions`);
  return data;
}

export async function fetchIntervention(id: string): Promise<ApiIntervention> {
  const { data } = await api.get(`/pathways/interventions/${id}`);
  return data;
}

export async function createIntervention(
  stageId: string,
  payload: {
    name: string;
    interventionType: string;
    description?: string;
    careSetting: string;
    deliveryMode: string;
    frequencyType: string;
    frequencyValue?: number;
    startDayOffset: number;
    endDayOffset?: number;
    defaultOwnerRole?: string;
    autoCompleteSource?: string;
    autoCompleteEventType?: string;
    priority: number;
    isCritical?: boolean;
    sortOrder: number;
  },
): Promise<ApiIntervention> {
  const { data } = await api.post(`/pathways/stages/${stageId}/interventions`, payload);
  return data;
}

export async function updateIntervention(
  id: string,
  payload: Partial<{
    name: string;
    interventionType: string;
    description: string | null;
    careSetting: string;
    deliveryMode: string;
    frequencyType: string;
    frequencyValue: number | null;
    startDayOffset: number;
    endDayOffset: number | null;
    defaultOwnerRole: string | null;
    autoCompleteSource: string | null;
    autoCompleteEventType: string | null;
    priority: number;
    isCritical: boolean;
    sortOrder: number;
  }>,
): Promise<ApiIntervention> {
  const { data } = await api.put(`/pathways/interventions/${id}`, payload);
  return data;
}

export async function deleteIntervention(id: string) {
  const { data } = await api.delete(`/pathways/interventions/${id}`);
  return data;
}

// ─── Transition CRUD ────────────────────────────────────────────────────────

export async function fetchTransitions(pathwayId: string): Promise<ApiTransition[]> {
  const { data } = await api.get(`/pathways/${pathwayId}/transitions`);
  return data;
}

export async function fetchTransition(id: string): Promise<ApiTransition> {
  const { data } = await api.get(`/pathways/transitions/${id}`);
  return data;
}

export async function createTransition(
  pathwayId: string,
  payload: {
    fromStageId: string;
    toStageId: string;
    ruleName: string;
    ruleDescription?: string;
    triggerType: string;
    conditionExpr?: Record<string, any>;
    priority?: number;
    isAutomatic?: boolean;
    isActive?: boolean;
  },
): Promise<ApiTransition> {
  const { data } = await api.post(`/pathways/${pathwayId}/transitions`, payload);
  return data;
}

export async function updateTransition(
  id: string,
  payload: Partial<{
    ruleName: string;
    ruleDescription: string | null;
    triggerType: string;
    conditionExpr: Record<string, any>;
    priority: number;
    isAutomatic: boolean;
    isActive: boolean;
  }>,
): Promise<ApiTransition> {
  const { data } = await api.put(`/pathways/transitions/${id}`, payload);
  return data;
}

export async function deleteTransition(id: string) {
  const { data } = await api.delete(`/pathways/transitions/${id}`);
  return data;
}
