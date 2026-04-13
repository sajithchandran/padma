import api from '@/lib/api';
import type { PaginatedApiResponse } from './tasks.service';

export interface ApiCareChatMessage {
  id: string;
  tenantId: string;
  patientId: string;
  enrollmentId?: string | null;
  pathwayId?: string | null;
  stageId?: string | null;
  taskId?: string | null;
  messageType: 'user' | 'system';
  eventType?: string | null;
  body: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export async function fetchEnrollmentCareChat(
  enrollmentId: string,
  params?: { page?: number; limit?: number },
) {
  const { data } = await api.get<PaginatedApiResponse<ApiCareChatMessage>>(
    `/enrollments/${enrollmentId}/care-chat`,
    { params },
  );
  return data;
}

export async function postEnrollmentCareChat(
  enrollmentId: string,
  payload: { body: string; metadata?: Record<string, unknown> },
) {
  const { data } = await api.post<ApiCareChatMessage>(
    `/enrollments/${enrollmentId}/care-chat`,
    payload,
  );
  return data;
}
