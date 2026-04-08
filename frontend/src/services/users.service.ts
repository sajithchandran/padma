import api from '@/lib/api';

export interface ApiUserMembership {
  userId: string;
  email: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  status: string;
  lastLoginAt?: string | null;
  roleId: string;
  roleCode: string;
  roleName: string;
  facilityId?: string | null;
  grantedAt: string;
}

export async function fetchUsers(): Promise<ApiUserMembership[]> {
  const { data } = await api.get('/users');
  return data;
}

export async function createUser(payload: {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  roleId: string;
  facilityId?: string;
}) {
  const { data } = await api.post('/users', payload);
  return data;
}

export async function assignUserRole(
  userId: string,
  payload: { roleId: string; facilityId?: string },
) {
  const { data } = await api.post(`/users/${userId}/roles`, payload);
  return data;
}
