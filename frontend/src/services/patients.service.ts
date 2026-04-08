import api from '@/lib/api';

export interface ApiPatientSearchResult {
  id: string;
  name: string;
  mrn?: string | null;
  dob?: string | null;
  gender?: string | null;
}

export async function searchPatients(params?: {
  q?: string;
  limit?: number;
}) {
  const { data } = await api.get<ApiPatientSearchResult[]>('/patients/search', { params });
  return data;
}
