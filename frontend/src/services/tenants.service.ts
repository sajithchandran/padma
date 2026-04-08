import api from '@/lib/api';

export interface ApiTenant {
  id: string;
  slug: string;
  name: string;
  displayName?: string | null;
  status: string;
  country: string;
  timezone: string;
  locale: string;
  contactEmail?: string | null;
  oidcIssuer?: string | null;
  oidcClientId?: string | null;
  featureFlags?: Record<string, boolean>;
}

export async function fetchCurrentTenant(): Promise<ApiTenant> {
  const { data } = await api.get('/tenants/me');
  return data;
}

export async function fetchTenantFeatureFlags(): Promise<Record<string, boolean>> {
  const { data } = await api.get('/tenants/me/feature-flags');
  return data;
}

export async function updateCurrentTenant(payload: {
  name?: string;
  displayName?: string;
  timezone?: string;
  locale?: string;
  contactEmail?: string;
}) {
  const { data } = await api.patch('/tenants/me', payload);
  return data;
}
