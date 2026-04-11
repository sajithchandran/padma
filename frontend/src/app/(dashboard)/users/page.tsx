'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  AlertCircle, Plus, Search, Shield, UserPlus, X, 
  Settings, CheckCircle2, MoreVertical, Mail, 
  Calendar, Key, Fingerprint, Activity,
  ChevronRight, ArrowRight, User
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_COLORS: Record<string, string> = {
  admin:            'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20',
  care_coordinator: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20',
  physician:        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
  nurse:            'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20',
  supervisor:       'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
  viewer:           'bg-muted text-muted-foreground ring-border',
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
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function groupPermissions(permissions: ApiPermission[]) {
  return permissions.reduce<Record<string, ApiPermission[]>>((acc, permission) => {
    const key = permission.resource || 'general';
    acc[key] ??= [];
    acc[key].push(permission);
    return acc;
  }, {});
}

// ─── Modals ───────────────────────────────────────────────────────────────────

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
    role.permissions.map((p) => p.id),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const groups = useMemo(() => groupPermissions(permissions), [permissions]);
  const isSystemRole = role.isSystem;

  const mutation = useMutation({
    mutationFn: (ids: string[]) => updateRolePermissions(role.id, ids),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to update permissions.');
    },
  });

  function toggle(id: string) {
    if (isSystemRole) return;
    setSelectedPermissionIds((curr) => curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative w-full sm:max-w-3xl bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] border border-border">
        <div className="px-6 py-5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">Edit Permissions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{role.name} · <span className="font-mono">{role.code}</span></p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500">{error}</div>}
          {isSystemRole && <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-medium">System roles are protected and read-only.</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(groups).map(([res, items]) => (
              <div key={res} className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{res}</p>
                {items.map((p) => {
                  const active = selectedPermissionIds.includes(p.id);
                  return (
                    <label key={p.id} className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group",
                      active ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border/50 hover:bg-muted/40"
                    )}>
                      <input type="checkbox" className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20" checked={active} onChange={() => toggle(p.id)} disabled={isSystemRole} />
                      <div className="min-w-0">
                        <p className={cn("text-xs font-bold transition-colors", active ? "text-primary" : "text-foreground/80")}>{p.code}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed opacity-70">{p.description || `${p.resource}:${p.action}`}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{selectedPermissionIds.length} active permissions</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => mutation.mutate(selectedPermissionIds)} loading={mutation.isPending} disabled={isSystemRole}>Save Changes</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CreateUserModal({ roles, onClose }: { roles: ApiRole[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({ email: '', firstName: '', lastName: '', displayName: '', roleId: roles[0]?.id ?? '', facilityId: '' });
  const [err, setErr] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createUser({ ...f, facilityId: f.facilityId || undefined }),
    onSuccess: async () => { 
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Failed to create user.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative w-full sm:max-w-2xl bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] border border-border">
        <div className="px-6 py-5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">Add Team Member</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Invite a new clinician or admin to the organization</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {err && <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-500 rounded-xl">{err}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input label="Email Address" value={f.email} onChange={(e) => setF({...f, email: e.target.value})} placeholder="clinician@example.com" />
             <Input label="Display Name" value={f.displayName} onChange={(e) => setF({...f, displayName: e.target.value})} placeholder="e.g. Dr. Menon" />
             <Input label="First Name" value={f.firstName} onChange={(e) => setF({...f, firstName: e.target.value})} />
             <Input label="Last Name" value={f.lastName} onChange={(e) => setF({...f, lastName: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground/70 uppercase tracking-widest mb-1.5">Assigned Role</label>
              <select value={f.roleId} onChange={(e) => setF({...f, roleId: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition">
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <Input label="Facility / Site ID" value={f.facilityId} onChange={(e) => setF({...f, facilityId: e.target.value})} placeholder="Optional UUID" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!f.email}>Create Account</Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'team' | 'roles'>('team');
  const [editingRole, setEditingRole] = useState<ApiRole | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles });
  const { data: permissions = [] } = useQuery({ queryKey: ['role-permissions'], queryFn: fetchPermissions, enabled: tab === 'roles' });

  const filtered = users.map((u) => ({
    id: u.userId,
    name: formatPersonName(u),
    email: u.email,
    roleId: u.roleId,
    role: u.roleName,
    roleCode: u.roleCode,
    status: u.status,
    facilityId: u.facilityId,
    lastSeenLabel: formatDateLabel(u.lastLoginAt),
    grantedAtLabel: formatDateLabel(u.grantedAt, 'Unknown'),
  })).filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Tab Switcher */}
      <div className="flex gap-1.5 bg-muted/50 p-1.5 rounded-2xl w-fit border border-border/50">
        {(['team', 'roles'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              tab === t ? "bg-card text-foreground shadow-premium border border-border" : "text-muted-foreground hover:text-foreground"
            )}>
            {t === 'team' ? 'Organization Team' : 'Roles & Permissions'}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:flex-1">
          <Input placeholder="Search clinicians, roles, or email…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex w-full sm:w-auto gap-2">
           <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setCreatingUser(true)} block className="sm:w-auto">
            Add User
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'team' ? (
          <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
               Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-card rounded-3xl border border-border animate-pulse p-6">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-muted" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-3/4 opacity-60" />
                    </div>
                  </div>
                </div>
              ))
            ) : filtered.map((u) => (
              <Card key={u.id} hover className="border-border/60 group">
                <div className="flex items-start gap-4">
                  <Avatar name={u.name} size="md" className="group-hover:ring-2 ring-primary/20 transition-all" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground font-display truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground font-medium truncate opacity-70">{u.email}</p>
                    <div className="mt-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider",
                        ROLE_COLORS[u.roleCode] ?? 'bg-muted text-muted-foreground border-border'
                      )}>
                        <Shield className="h-3 w-3" />
                        {u.role}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={u.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/40">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Last Active</label>
                    <p className="text-xs font-bold text-foreground/80">{u.lastSeenLabel}</p>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1 text-right">Site Scope</label>
                    <p className="text-xs font-bold text-foreground/80 truncate">{u.facilityId || 'Global Access'}</p>
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>
        ) : (
          <motion.div key="roles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {roles.map((r) => (
              <Card key={r.id} hover className="border-border/60">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", ROLE_COLORS[r.code] || 'bg-muted')}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground font-display">{r.name}</h4>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">{r.code}</p>
                    </div>
                  </div>
                  {r.isSystem && <Badge variant="neutral" size="xs">System</Badge>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem] leading-relaxed mb-5">{r.description || 'No description provided for this role.'}</p>
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{r.permissions.length} Permissions</span>
                  <Button variant="ghost" size="xs" onClick={() => setEditingRole(r)} iconRight={<ChevronRight className="h-3 w-3" />}>
                    Manage
                  </Button>
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {editingRole && <RoleEditorModal role={editingRole} permissions={permissions} onClose={() => setEditingRole(null)} />}
      {creatingUser && <CreateUserModal roles={roles} onClose={() => setCreatingUser(false)} />}
    </div>
  );
}
