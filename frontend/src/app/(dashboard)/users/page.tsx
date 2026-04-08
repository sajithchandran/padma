'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, Search, Shield, UserPlus, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { assignUserRole, createUser, fetchUsers, type ApiUserMembership } from '@/services/users.service';
import {
  createRole,
  fetchPermissions,
  fetchRoles,
  updateRolePermissions,
  type ApiPermission,
  type ApiRole,
} from '@/services/roles.service';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-violet-50 text-violet-700 ring-violet-200',
  care_coordinator: 'bg-blue-50 text-blue-700 ring-blue-200',
  physician: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  nurse: 'bg-teal-50 text-teal-700 ring-teal-200',
  supervisor: 'bg-amber-50 text-amber-700 ring-amber-200',
  viewer: 'bg-slate-100 text-slate-600 ring-slate-200',
};

type ViewUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: string;
  roleCode: string;
  status: string;
  facilityId?: string | null;
  lastSeenLabel: string;
  grantedAtLabel: string;
};

function formatPersonName(user: ApiUserMembership) {
  const fallback = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return user.displayName?.trim() || fallback || user.email;
}

function formatDateLabel(value?: string | null, fallback = 'Never') {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function groupPermissions(permissions: ApiPermission[]) {
  return permissions.reduce<Record<string, ApiPermission[]>>((acc, permission) => {
    const key = permission.resource || 'general';
    acc[key] ??= [];
    acc[key].push(permission);
    return acc;
  }, {});
}

function RoleEditorModal({
  role,
  permissions,
  onClose,
}: {
  role: ApiRole;
  permissions: ApiPermission[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(() =>
    role.permissions.map((permission) => permission.id),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions]);
  const isSystemRole = role.isSystem;

  const mutation = useMutation({
    mutationFn: (permissionIds: string[]) => updateRolePermissions(role.id, permissionIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to update role permissions.'));
    },
  });

  function togglePermission(permissionId: string) {
    setSelectedPermissionIds((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId],
    );
  }

  function handleSave() {
    if (isSystemRole) return;
    mutation.mutate(selectedPermissionIds);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Role Permissions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {role.name} · {role.code}
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

          {isSystemRole && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              System roles are read-only in the current backend API. You can review permissions here, but only custom roles can be edited.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(permissionGroups).map(([resource, items]) => (
              <Card key={resource} className="p-4">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{resource}</p>
                  <p className="text-xs text-slate-400 mt-1">{items.length} available permissions</p>
                </div>
                <div className="space-y-2">
                  {items.map((permission) => {
                    const checked = selectedPermissionIds.includes(permission.id);
                    return (
                      <label
                        key={permission.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                          checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
                        } ${isSystemRole ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={checked}
                          disabled={isSystemRole || mutation.isPending}
                          onChange={() => togglePermission(permission.id)}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{permission.code}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {permission.description || `${permission.resource}:${permission.action}`}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-sm text-slate-500">
            {selectedPermissionIds.length} permissions selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button onClick={handleSave} loading={mutation.isPending} disabled={isSystemRole}>
              Save Permissions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function slugifyRoleCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function CreateRoleModal({
  permissions,
  onClose,
}: {
  permissions: ApiPermission[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions]);
  const normalizedCode = code.trim() || slugifyRoleCode(name);
  const isValid = name.trim().length > 0 && normalizedCode.length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      createRole({
        name: name.trim(),
        code: normalizedCode,
        description: description.trim() || undefined,
        permissionIds: selectedPermissionIds,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create role.'));
    },
  });

  function togglePermission(permissionId: string) {
    setSelectedPermissionIds((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Custom Role</h2>
            <p className="text-xs text-slate-500 mt-0.5">Define a tenant role and assign its permissions</p>
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
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Role Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nurse Lead"
                disabled={mutation.isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Role Code</label>
              <Input
                value={code}
                onChange={(e) => setCode(slugifyRoleCode(e.target.value))}
                placeholder="nurse_lead"
                disabled={mutation.isPending}
              />
              <p className="mt-1 text-xs text-slate-500">
                Auto-generated from the name if left blank.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={mutation.isPending}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Clinical supervisor for nursing workflows and escalations"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(permissionGroups).map(([resource, items]) => (
              <Card key={resource} className="p-4">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{resource}</p>
                  <p className="text-xs text-slate-400 mt-1">{items.length} available permissions</p>
                </div>
                <div className="space-y-2">
                  {items.map((permission) => {
                    const checked = selectedPermissionIds.includes(permission.id);
                    return (
                      <label
                        key={permission.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 transition cursor-pointer ${
                          checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={checked}
                          disabled={mutation.isPending}
                          onChange={() => togglePermission(permission.id)}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{permission.code}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {permission.description || `${permission.resource}:${permission.action}`}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-sm text-slate-500">{selectedPermissionIds.length} permissions selected</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!isValid}>
              Create Role
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserRoleModal({
  user,
  roles,
  mode,
  onClose,
}: {
  user: ViewUser;
  roles: ApiRole[];
  mode: 'edit' | 'assign';
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [roleId, setRoleId] = useState(user.roleId);
  const [facilityId, setFacilityId] = useState(user.facilityId ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const selectedRole = roles.find((role) => role.id === roleId) ?? null;

  const mutation = useMutation({
    mutationFn: () => assignUserRole(user.id, { roleId, facilityId: facilityId.trim() || undefined }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
      ]);
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to update user role.'));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === 'edit' ? 'Edit User Access' : 'Assign Role'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {user.name} · {user.email}
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

          <Card className="p-4">
            <div className="flex items-start gap-4">
              <Avatar name={user.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={user.status} />
                  <Badge variant="neutral" size="sm">Current role: {user.role}</Badge>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Role
              </label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Facility ID
              </label>
              <Input
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                placeholder="Optional facility UUID"
                disabled={mutation.isPending}
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave blank to grant tenant-wide access.
              </p>
            </div>
          </div>

          {selectedRole && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Selected Role Permissions</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedRole.permissions.length} permissions on this role
                  </p>
                </div>
                {selectedRole.isSystem ? <Badge variant="neutral" size="sm">System</Badge> : <Badge variant="info" size="sm">Custom</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedRole.permissions.map((permission) => (
                  <Badge key={permission.id} variant="neutral" size="sm">
                    {permission.code}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!roleId}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({
  roles,
  onClose,
}: {
  roles: ApiRole[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const [facilityId, setFacilityId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const selectedRole = roles.find((role) => role.id === roleId) ?? null;
  const isValid = email.trim().length > 0 && roleId.length > 0;

  const mutation = useMutation({
    mutationFn: () => createUser({
      email: email.trim(),
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      displayName: displayName.trim() || undefined,
      roleId,
      facilityId: facilityId.trim() || undefined,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
      ]);
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create user.'));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add New User</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Create a tenant user and assign an initial role
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
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="clinician@example.com"
              disabled={mutation.isPending}
            />
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Dr. Priya Menon"
              disabled={mutation.isPending}
            />
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Priya"
              disabled={mutation.isPending}
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Menon"
              disabled={mutation.isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Role</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Facility ID"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              placeholder="Optional facility UUID"
              disabled={mutation.isPending}
            />
          </div>

          {selectedRole && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Selected Role</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedRole.permissions.length} permissions on this role
                  </p>
                </div>
                {selectedRole.isSystem ? <Badge variant="neutral" size="sm">System</Badge> : <Badge variant="info" size="sm">Custom</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedRole.permissions.map((permission) => (
                  <Badge key={permission.id} variant="neutral" size="sm">
                    {permission.code}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!isValid}>
            Create User
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'team' | 'roles'>('team');
  const [editingRole, setEditingRole] = useState<ApiRole | null>(null);
  const [editingUser, setEditingUser] = useState<{ user: ViewUser; mode: 'edit' | 'assign' } | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
  const {
    data: roles = [],
    isLoading: rolesLoading,
    isError: rolesError,
    error: rolesQueryError,
  } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });
  const { data: permissions = [] } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: fetchPermissions,
    enabled: tab === 'roles',
  });

  const filtered: ViewUser[] = users.map((user) => ({
    id: user.userId,
    name: formatPersonName(user),
    email: user.email,
    roleId: user.roleId,
    role: user.roleName,
    roleCode: user.roleCode,
    status: user.status,
    facilityId: user.facilityId,
    lastSeenLabel: formatDateLabel(user.lastLoginAt),
    grantedAtLabel: formatDateLabel(user.grantedAt, 'Unknown'),
  })).filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const totalAvailablePermissions = permissions.length || Math.max(...roles.map((role) => role.permissions.length), 0);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['team', 'roles'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'team' ? 'Team Members' : 'Roles & Permissions'}
          </button>
        ))}
      </div>

      {tab === 'team' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input placeholder="Search team members…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
            </div>
            <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setCreatingUser(true)}>Add New User</Button>
          </div>

          {isLoading ? (
            <Card className="p-8">
              <p className="text-sm text-slate-500">Loading users from the backend…</p>
            </Card>
          ) : isError ? (
            <Card className="p-8">
              <p className="text-sm font-medium text-red-700">Unable to load users.</p>
              <p className="mt-1 text-sm text-slate-500">
                {error instanceof Error ? error.message : 'The users API request failed.'}
              </p>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="p-8">
              <p className="text-sm font-medium text-slate-900">No users found.</p>
              <p className="mt-1 text-sm text-slate-500">
                {users.length === 0 ? 'The backend returned no active tenant users.' : 'Try adjusting the search term.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((u) => (
                <Card key={u.id} hover className="flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <Avatar name={u.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${ROLE_COLORS[u.roleCode] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                          <Shield className="h-3 w-3" />
                          {u.role}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={u.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Last Login</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{u.lastSeenLabel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Facility</p>
                      <p className="mt-1 text-sm font-medium text-slate-900 truncate">{u.facilityId || 'All facilities'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">Granted {u.grantedAtLabel}</p>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="xs" onClick={() => setEditingUser({ user: u, mode: 'edit' })}>Edit</Button>
                      <Button variant="ghost" size="xs" onClick={() => setEditingUser({ user: u, mode: 'assign' })}>Assign</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {roles.length} roles configured with granular permission control.
            </p>
            <Button icon={<Plus className="h-4 w-4" />} variant="outline" onClick={() => setCreatingRole(true)}>Custom Role</Button>
          </div>

          {rolesLoading ? (
            <Card className="p-8">
              <p className="text-sm text-slate-500">Loading roles from the backend…</p>
            </Card>
          ) : rolesError ? (
            <Card className="p-8">
              <p className="text-sm font-medium text-red-700">Unable to load roles.</p>
              <p className="mt-1 text-sm text-slate-500">
                {rolesQueryError instanceof Error ? rolesQueryError.message : 'The roles API request failed.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => (
                <Card key={role.id} hover className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-blue-500" />
                        <h3 className="font-semibold text-slate-900">{role.name}</h3>
                        {role.isSystem ? <Badge variant="neutral" size="sm">System</Badge> : <Badge variant="info" size="sm">Custom</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">{role.description || 'No description available for this role.'}</p>
                    </div>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${ROLE_COLORS[role.code] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                      {role.code}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Assigned Users</p>
                      <p className="mt-1 font-medium text-slate-900">{role.userCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Permission Scope</p>
                      <p className="mt-1 font-medium text-slate-900">{role.permissions.length}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex-1 w-32">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(role.permissions.length / Math.max(totalAvailablePermissions, 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {role.permissions.length}/{Math.max(totalAvailablePermissions, role.permissions.length)} permissions
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="xs" onClick={() => setEditingRole(role)}>Edit</Button>
                      <Button variant="ghost" size="xs">Clone</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {editingRole && (
        <RoleEditorModal
          role={editingRole}
          permissions={permissions}
          onClose={() => setEditingRole(null)}
        />
      )}

      {creatingRole && (
        <CreateRoleModal
          permissions={permissions}
          onClose={() => setCreatingRole(false)}
        />
      )}

      {editingUser && (
        <UserRoleModal
          user={editingUser.user}
          roles={roles}
          mode={editingUser.mode}
          onClose={() => setEditingUser(null)}
        />
      )}

      {creatingUser && (
        <CreateUserModal
          roles={roles}
          onClose={() => setCreatingUser(false)}
        />
      )}
    </div>
  );
}
