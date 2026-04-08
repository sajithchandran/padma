import api from '@/lib/api';

export interface ApiPatientMessage {
  id: string;
  tenantId: string;
  patientId: string;
  channel: string;
  direction: string;
  templateCode?: string | null;
  subject?: string | null;
  body: string;
  purpose: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  status: string;
  providerName?: string | null;
  providerRef?: string | null;
  providerResponse?: Record<string, unknown> | null;
  failureReason?: string | null;
  retryCount: number;
  idempotencyKey?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CommunicationPatientOption {
  id: string;
  name: string;
}

export async function fetchCommunicationPatients() {
  const { data } = await api.get<ApiPaginatedResponse<{
    patientId: string;
    patientDisplayName?: string | null;
  }>>('/enrollments', {
    params: {
      page: 1,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  });

  const patients = data.data
    .filter((item) => item.patientId)
    .map((item) => ({
      id: item.patientId,
      name: item.patientDisplayName?.trim() || item.patientId,
    }));

  return Array.from(new Map(patients.map((patient) => [patient.id, patient])).values());
}

export async function fetchPatientMessages(patientId: string, params?: { page?: number; limit?: number }) {
  const { data } = await api.get<ApiPaginatedResponse<ApiPatientMessage>>(`/patients/${patientId}/messages`, { params });
  return data;
}

export async function fetchCommunicationMessages(params?: {
  patientId?: string;
  direction?: string;
  channel?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get<ApiPaginatedResponse<ApiPatientMessage>>('/communication/messages', { params });
  return data;
}

export async function sendCommunicationMessage(payload: {
  patientId: string;
  channel: string;
  templateCode: string;
  variables?: Record<string, unknown>;
  purpose: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  idempotencyKey?: string;
}) {
  const { data } = await api.post<ApiPatientMessage>('/communication/send', payload);
  return data;
}
