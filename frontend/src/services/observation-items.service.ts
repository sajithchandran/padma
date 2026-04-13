import api from '@/lib/api';

export interface ApiObservationItem {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: string;
  dataType: string;
  unit?: string | null;
  allowedValues?: unknown | null;
  normalRangeMin?: string | null;
  normalRangeMax?: string | null;
  criticalLow?: string | null;
  criticalHigh?: string | null;
  precisionScale?: number | null;
  isActive: boolean;
  isMandatory: boolean;
  displayOrder: number;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ObservationItemPayload {
  code: string;
  name: string;
  category: string;
  dataType: string;
  unit?: string;
  allowedValues?: unknown;
  normalRangeMin?: string | number;
  normalRangeMax?: string | number;
  criticalLow?: string | number;
  criticalHigh?: string | number;
  precisionScale?: number;
  isActive?: boolean;
  isMandatory?: boolean;
  displayOrder?: number;
  description?: string;
}

export async function fetchObservationItems(params?: {
  q?: string;
  category?: string;
  dataType?: string;
  activeOnly?: boolean;
}) {
  const { data } = await api.get<ApiObservationItem[]>('/observation-items', { params });
  return data;
}

export async function createObservationItem(payload: ObservationItemPayload) {
  const { data } = await api.post<ApiObservationItem>('/observation-items', payload);
  return data;
}

export async function updateObservationItem(id: string, payload: Partial<ObservationItemPayload>) {
  const { data } = await api.put<ApiObservationItem>(`/observation-items/${id}`, payload);
  return data;
}

export async function deactivateObservationItem(id: string) {
  const { data } = await api.delete<ApiObservationItem>(`/observation-items/${id}`);
  return data;
}
