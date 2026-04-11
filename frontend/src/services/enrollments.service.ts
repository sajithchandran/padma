import api from '@/lib/api';
import type { PaginatedApiResponse } from './tasks.service';

export interface ApiEnrollmentStage {
  id: string;
  name: string;
  code: string;
  stageType: string;
  sortOrder?: number;
}

export interface ApiTransitionReadiness {
  canTransition: boolean;
  blockingTaskCount: number;
  currentStageId: string;
  currentStage: ApiEnrollmentStage;
  nextStages: Array<ApiEnrollmentStage & {
    transitionRuleId?: string;
    ruleName?: string;
  }>;
  reason?: string | null;
}

export interface ApiStageHistoryItem {
  id: string;
  fromStageName?: string | null;
  toStageName: string;
  transitionType: string;
  reason?: string | null;
  performedBy?: string | null;
  transitionedAt: string;
  fromStage?: ApiEnrollmentStage | null;
  toStage?: ApiEnrollmentStage;
  transitionRule?: {
    id: string;
    ruleName: string;
    triggerType: string;
  } | null;
}

export async function startEnrollment(enrollmentId: string) {
  const { data } = await api.post(`/enrollments/${enrollmentId}/start`);
  return data;
}

export async function fetchTransitionReadiness(enrollmentId: string) {
  const { data } = await api.get<ApiTransitionReadiness>(`/enrollments/${enrollmentId}/transition-readiness`);
  return data;
}

export async function transitionEnrollment(
  enrollmentId: string,
  payload: { toStageId: string; reason: string },
) {
  const { data } = await api.post(`/enrollments/${enrollmentId}/transition`, payload);
  return data;
}

export async function fetchStageHistory(enrollmentId: string) {
  const { data } = await api.get<ApiStageHistoryItem[]>(`/enrollments/${enrollmentId}/stage-history`);
  return data;
}

export type ApiPaginatedEnrollmentResponse<T> = PaginatedApiResponse<T>;
