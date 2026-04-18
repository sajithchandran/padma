import api from '@/lib/api';

export interface ApiPatientListItem {
  id: string;
  name: string;
  mrn?: string | null;
  dob?: string | null;
  gender?: string | null;
  status: string;
  riskLevel: string;
  currentPathways: string[];
  currentPathwaySummary: string;
  assignedCareCoordinator?: string | null;
  enrolledPathways: number;
  enrollments: Array<{
    enrollmentId: string;
    pathwayId: string;
    pathwayName: string;
    status: string;
    currentStage: {
      id: string;
      name: string;
      code: string;
      stageType: string;
      sortOrder: number;
    };
    totalTasks: number;
    completedTasks: number;
    openTasks: number;
    overdueTasks: number;
    canStart: boolean;
    lastActivityAt?: string | null;
  }>;
  openTasks: number;
  overdueTasks: number;
  lastActivityAt?: string | null;
}

export interface ApiPatientSearchResult {
  id: string;
  name: string;
  mrn?: string | null;
  dob?: string | null;
  gender?: string | null;
}

export async function fetchPatients(params?: {
  q?: string;
  status?: string;
  filter?: 'mine';
}) {
  const { data } = await api.get<ApiPatientListItem[]>('/patients', { params });
  return data;
}

export async function fetchPatient(patientId: string) {
  const patients = await fetchPatients();
  const patient = patients.find((item) => item.id === patientId);

  if (!patient) {
    throw new Error(`Patient ${patientId} not found`);
  }

  return patient;
}

export async function searchPatients(params?: {
  q?: string;
  limit?: number;
}) {
  const { data } = await api.get<ApiPatientSearchResult[]>('/patients/search', { params });
  return data;
}
