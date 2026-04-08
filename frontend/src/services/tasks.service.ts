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
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get<PaginatedApiResponse<ApiTask>>('/tasks', { params });
  return data;
}
