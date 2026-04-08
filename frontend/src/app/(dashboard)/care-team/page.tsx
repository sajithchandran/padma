'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Pencil, Plus, Search, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  createNamedCareTeam,
  type ApiNamedCareTeam,
  fetchCareTeamRoles,
  fetchNamedCareTeams,
  updateNamedCareTeam,
} from '@/services/care-team.service';
import { fetchUsers } from '@/services/users.service';

function formatPersonName(member: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) {
  const fallback = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  return member.displayName?.trim() || fallback || member.email;
}

type CareTeamModalProps = {
  roles: Array<{ id: string; code: string; name: string; description?: string | null }>;
  team?: ApiNamedCareTeam | null;
  onClose: () => void;
};

function CareTeamModal({
  roles,
  team,
  onClose,
}: CareTeamModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [teamName, setTeamName] = useState(team?.name ?? '');
  const [description, setDescription] = useState(team?.description ?? '');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, { roleId: string; facilityId: string }>>(
    () => Object.fromEntries(
      (team?.members ?? []).map((member) => [
        member.userId,
        {
          roleId: member.roleId,
          facilityId: member.facilityId ?? '',
        },
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(team);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['tenant-users-for-care-team'],
    queryFn: fetchUsers,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = formatPersonName(user).toLowerCase();
    return name.includes(q) || user.email.toLowerCase().includes(q) || user.roleName.toLowerCase().includes(q);
  }), [users, search]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: teamName.trim(),
        description: description.trim() || undefined,
        members: Object.entries(selectedMembers).map(([userId, config]) => ({
          userId,
          roleId: config.roleId,
          facilityId: config.facilityId.trim() || undefined,
        })),
      };

      return isEditing && team
        ? updateNamedCareTeam(team.id, payload)
        : createNamedCareTeam(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['care-team-teams'] }),
        queryClient.invalidateQueries({ queryKey: ['care-team-roles'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-users-for-care-team'] }),
      ]);
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? `Failed to ${isEditing ? 'update' : 'create'} care team.`));
    },
  });

  function toggleUser(userId: string) {
    setSelectedMembers((current) => {
      if (current[userId]) {
        const next = { ...current };
        delete next[userId];
        return next;
      }

      return {
        ...current,
        [userId]: {
          roleId: roles[0]?.id ?? '',
          facilityId: '',
        },
      };
    });
  }

  function updateMember(userId: string, field: 'roleId' | 'facilityId', value: string) {
    setSelectedMembers((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      },
    }));
  }

  const selectedCount = Object.keys(selectedMembers).length;
  const isValid = teamName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{isEditing ? 'Edit Care Team' : 'Create Care Team'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? 'Update the care team name, description, and member composition'
                : 'Create a named care team and add members from the tenant directory'}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Care Team Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Diabetes CCM Team A"
              disabled={mutation.isPending}
            />
            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Care team for diabetes chronic care management"
              disabled={mutation.isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.2fr,0.8fr] gap-5">
            <Card className="p-4">
              <div className="space-y-4">
                <Input
                  placeholder="Search existing tenant users…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                  disabled={mutation.isPending}
                />
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {isLoading ? (
                    <p className="text-sm text-slate-500">Loading tenant users…</p>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-sm text-slate-500">No matching users found.</p>
                  ) : (
                    filteredUsers.map((user) => {
                      const selected = Boolean(selectedMembers[user.userId]);
                      const name = formatPersonName(user);
                      return (
                        <div
                          key={user.userId}
                          className={`w-full text-left rounded-xl border p-3 transition ${
                            selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar name={name} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                              <p className="text-xs text-slate-500 truncate">{user.email}</p>
                              <p className="text-xs text-slate-400 mt-1">{user.roleName}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleUser(user.userId)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </div>
                          {selected && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">Team Role</label>
                                <select
                                  value={selectedMembers[user.userId].roleId}
                                  onChange={(e) => updateMember(user.userId, 'roleId', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                >
                                  {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                      {role.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">Facility ID</label>
                                <Input
                                  value={selectedMembers[user.userId].facilityId}
                                  onChange={(e) => updateMember(user.userId, 'facilityId', e.target.value)}
                                  placeholder="Optional"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Team Summary</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{teamName.trim() || 'Untitled care team'}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedCount} selected member{selectedCount === 1 ? '' : 's'}</p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Team members must already exist as tenant users with an active eligible role. The backend does not yet expose a create-user or invite-user API.
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!isValid || isLoading}
          >
            {isEditing ? 'Save Changes' : 'Create Care Team'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CareTeamPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ApiNamedCareTeam | null>(null);

  const {
    data: teams = [],
    isLoading: teamsLoading,
    isError: teamsError,
    error: teamsQueryError,
  } = useQuery({
    queryKey: ['care-team-teams'],
    queryFn: fetchNamedCareTeams,
  });

  const {
    data: roles = [],
    isLoading: rolesLoading,
    isError: rolesError,
    error: rolesQueryError,
  } = useQuery({
    queryKey: ['care-team-roles'],
    queryFn: fetchCareTeamRoles,
  });

  const roleOptions = useMemo(
    () => [{ code: 'ALL', name: 'All roles' }, ...roles.map((role) => ({ code: role.code, name: role.name }))],
    [roles],
  );

  const filteredTeams = useMemo(
    () =>
      teams.filter((team) => {
        const matchesRole = roleFilter === 'ALL'
          || team.members.some((member) => member.roleCode === roleFilter);

        const query = search.trim().toLowerCase();
        const matchesSearch = !query
          || team.name.toLowerCase().includes(query)
          || (team.description?.toLowerCase().includes(query) ?? false)
          || team.members.some((member) =>
            member.roleName.toLowerCase().includes(query)
            || formatPersonName(member).toLowerCase().includes(query),
          );

        return matchesRole && matchesSearch;
      }),
    [teams, roleFilter, search],
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>Create Care Team</Button>}>
          <CardTitle>Named Care Teams</CardTitle>
          <CardSubtitle>Create multiple named care teams and manage their member composition</CardSubtitle>
        </CardHeader>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search care teams by name, description, role, or member"
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            disabled={rolesLoading || rolesError}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:min-w-52"
          >
            {roleOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        {teamsLoading ? (
          <p className="text-sm text-slate-500">Loading named care teams…</p>
        ) : teamsError ? (
          <p className="text-sm text-red-700">
            {teamsQueryError instanceof Error ? teamsQueryError.message : 'Unable to load named care teams.'}
          </p>
        ) : teams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No named care teams yet. Create one to group members under a reusable care team name.
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No care teams match the current search or filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTeams.map((team) => {
              const roleNames = Array.from(new Set(team.members.map((member) => member.roleName)));

              return (
                <div key={team.id} className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{team.description || 'No description provided.'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="info" size="sm">{team.memberCount} members</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => setEditingTeam(team)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {roleNames.slice(0, 3).map((roleName) => (
                      <Badge key={roleName} variant="neutral" size="sm">
                        {roleName}
                      </Badge>
                    ))}
                    {roleNames.length > 3 && (
                      <Badge variant="neutral" size="sm">
                        +{roleNames.length - 3} roles
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showCreateModal && (
        <CareTeamModal
          roles={roles}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {editingTeam && (
        <CareTeamModal
          roles={roles}
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
        />
      )}
    </div>
  );
}
