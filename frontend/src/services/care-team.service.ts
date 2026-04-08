import api from '@/lib/api';

export interface ApiCareTeamMember {
  userId: string;
  email: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  status: string;
  lastLoginAt?: string | null;
  roleId: string;
  roleCode: string;
  roleName: string;
  roleDescription?: string | null;
  isSystemRole: boolean;
  facilityId?: string | null;
  grantedAt: string;
}

export interface ApiCareTeamRole {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  tenantId?: string | null;
  memberCount: number;
  careTeamEligible: boolean;
}

export interface ApiNamedCareTeamMember {
  id: string;
  userId: string;
  email: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  status: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  facilityId?: string | null;
  addedAt: string;
}

export interface ApiNamedCareTeam {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  memberCount: number;
  members: ApiNamedCareTeamMember[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchCareTeamMembers(params?: {
  roleCode?: string;
  search?: string;
}) {
  const { data } = await api.get<ApiCareTeamMember[]>('/care-team/members', { params });
  return data;
}

export async function fetchCareTeamRoles() {
  const { data } = await api.get<ApiCareTeamRole[]>('/care-team/roles');
  return data;
}

export async function fetchNamedCareTeams() {
  const { data } = await api.get<ApiNamedCareTeam[]>('/care-team/teams');
  return data;
}

export async function createNamedCareTeam(payload: {
  name: string;
  description?: string;
  members?: Array<{
    userId: string;
    roleId: string;
    facilityId?: string;
  }>;
}) {
  const { data } = await api.post<ApiNamedCareTeam>('/care-team/teams', payload);
  return data;
}

export async function updateNamedCareTeam(
  teamId: string,
  payload: {
    name: string;
    description?: string;
    members?: Array<{
      userId: string;
      roleId: string;
      facilityId?: string;
    }>;
  },
) {
  const { data } = await api.put<ApiNamedCareTeam>(`/care-team/teams/${teamId}`, payload);
  return data;
}
