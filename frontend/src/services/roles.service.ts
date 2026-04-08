import api from '@/lib/api';

export interface ApiPermission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description?: string | null;
}

export interface ApiRole {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  tenantId?: string | null;
  permissions: ApiPermission[];
  userCount: number;
}

export async function fetchRoles(): Promise<ApiRole[]> {
  const { data } = await api.get('/roles');
  return data;
}

export async function fetchPermissions(): Promise<ApiPermission[]> {
  const { data } = await api.get('/roles/permissions');
  return data;
}

export async function createRole(payload: {
  code: string;
  name: string;
  description?: string;
  permissionIds?: string[];
}) {
  const { data } = await api.post('/roles', payload);
  return data;
}

export async function updateRolePermissions(roleId: string, permissionIds: string[]) {
  const { data } = await api.put(`/roles/${roleId}/permissions`, { permissionIds });
  return data;
}
