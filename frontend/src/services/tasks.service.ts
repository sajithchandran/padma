import api from '@/lib/api';

export interface ApiTask {
  id: string;
  patientId: string;
  enrollmentId: string;
  stageId: string;
  patientDisplayName?: string | null;
  patientMrn?: string | null;
  title: string;
  description?: string | null;
  dueDate: string;
  dueTime?: string | null;
  assignedToUserId?: string | null;
  assignedToRole?: string | null;
  priority: number;
  isCritical?: boolean;
  status: string;
  completionNotes?: string | null;
  taskEvents?: Array<{
    id: string;
    eventType: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    payload?: Record<string, unknown> | null;
    performedBy?: string | null;
    createdAt: string;
  }>;
  interventionTemplate?: {
    id: string;
    name: string;
    interventionType: string;
  } | null;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function fetchTasks(params?: {
  assignedToUserId?: string;
  enrollmentId?: string;
  stageId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get<PaginatedApiResponse<ApiTask>>('/tasks', { params });
  return data;
}

export async function fetchEnrollmentTasks(enrollmentId: string, params?: {
  stageId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get<PaginatedApiResponse<ApiTask>>(`/enrollments/${enrollmentId}/tasks`, { params });
  return data;
}

export async function completeTask(taskId: string, payload?: {
  completionNotes?: string;
  completionMethod?: string;
  completionEvidence?: Record<string, unknown>;
}) {
  const { data } = await api.post<ApiTask>(`/tasks/${taskId}/complete`, payload ?? {});
  return data;
}

export async function fetchTask(taskId: string) {
  const { data } = await api.get<ApiTask>(`/tasks/${taskId}`);
  return data;
}

export async function updateTaskStatus(taskId: string, payload: {
  status: 'pending' | 'upcoming' | 'active' | 'completed' | 'skipped' | 'cancelled';
  completionNotes?: string;
  completionMethod?: string;
  completionEvidence?: Record<string, unknown>;
}) {
  const { data } = await api.put<ApiTask>(`/tasks/${taskId}/status`, payload);
  return data;
}

export async function reassignTask(taskId: string, payload: {
  assignedToUserId?: string | null;
  assignedToRole?: string | null;
}) {
  const { data } = await api.post<ApiTask>(`/tasks/${taskId}/reassign`, payload);
  return data;
}
