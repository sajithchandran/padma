import api from '@/lib/api';

export interface ApiPatientConsent {
  id: string;
  tenantId: string;
  patientId: string;
  consentType: string;
  status: string;
  grantedAt: string;
  withdrawnAt?: string | null;
  expiresAt?: string | null;
  consentVersion?: string | null;
  collectionMethod: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchPatientConsents(patientId: string) {
  const { data } = await api.get<ApiPatientConsent[]>(`/privacy/consents/${patientId}`);
  return data;
}

export async function grantPatientConsent(
  patientId: string,
  payload: {
    consentType: string;
    method: string;
    version?: string;
  },
) {
  const { data } = await api.post<ApiPatientConsent>(`/privacy/consents/${patientId}`, payload);
  return data;
}

export async function withdrawPatientConsent(patientId: string, consentType: string) {
  const { data } = await api.delete(`/privacy/consents/${patientId}/${encodeURIComponent(consentType)}`);
  return data;
}
