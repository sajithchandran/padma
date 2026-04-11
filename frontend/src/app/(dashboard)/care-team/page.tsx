'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  AlertCircle, Pencil, Plus, Search, X, 
  Users, UserPlus, Shield, ChevronRight,
  MoreVertical, CheckCircle2, LayoutGrid
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function formatPersonName(member: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) {
  const fallback = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  return member.displayName?.trim() || fallback || member.email;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function CareTeamModal({
  roles,
  team,
  onClose,
}: {
  roles: Array<{ id: string; code: string; name: string }>;
  team?: ApiNamedCareTeam | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [teamName, setTeamName] = useState(team?.name ?? '');
  const [description, setDescription] = useState(team?.description ?? '');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, { roleId: string; facilityId: string }>>(
    () => Object.fromEntries(
      (team?.members ?? []).map((m) => [m.userId, { roleId: m.roleId, facilityId: m.facilityId ?? '' }])
    )
  );
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(team);

  const { data: users = [], isLoading } = useQuery({ queryKey: ['tenant-users-for-care-team'], queryFn: fetchUsers });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const filtered = useMemo(() => users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return formatPersonName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
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
      return isEditing && team ? updateNamedCareTeam(team.id, payload) : createNamedCareTeam(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['care-team-teams'] });
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Action failed.'),
  });

  function toggle(id: string) {
    setSelectedMembers((curr) => {
      if (curr[id]) {
        const next = { ...curr };
        delete next[id];
        return next;
      }
      return { ...curr, [id]: { roleId: roles[0]?.id ?? '', facilityId: '' } };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative w-full sm:max-w-3xl bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] border border-border">
        <div className="px-6 py-5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">{isEditing ? 'Configure Care Team' : 'New Care Team Group'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Define clinicians and their internal operational roles</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-500 rounded-xl font-bold">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input label="Team Identity" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Chronic Care Team A" />
             <Input label="Short Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objectives of this group..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.3fr,0.7fr] gap-6">
            <div className="space-y-4">
               <Input placeholder="Filter organization clinicians…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
               <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {isLoading ? <div className="h-20 bg-muted/20 animate-pulse rounded-xl" /> : filtered.map((u) => {
                    const active = Boolean(selectedMembers[u.userId]);
                    return (
                      <div key={u.userId} onClick={() => toggle(u.userId)} className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer group",
                        active ? "bg-primary/5 border-primary/30" : "bg-muted/10 border-border/40 hover:bg-muted/30"
                      )}>
                        <div className="flex items-center gap-3">
                           <Avatar name={formatPersonName(u)} size="sm" />
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{formatPersonName(u)}</p>
                              <p className="text-[10px] text-muted-foreground truncate opacity-70">{u.email}</p>
                           </div>
                           <div className={cn("h-5 w-5 rounded-md border flex items-center justify-center transition-all", active ? "bg-primary border-primary text-white" : "border-border")}>
                              {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                           </div>
                        </div>
                        {active && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-primary/10" onClick={(e) => e.stopPropagation()}>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Team Assignment</label>
                                <select 
                                  value={selectedMembers[u.userId].roleId}
                                  onChange={(e) => setSelectedMembers({...selectedMembers, [u.userId]: {...selectedMembers[u.userId], roleId: e.target.value}})}
                                  className="h-8 w-full rounded-lg bg-card border border-border px-2 text-[10px] font-bold"
                                >
                                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Scope ID</label>
                                <input 
                                  value={selectedMembers[u.userId].facilityId}
                                  onChange={(e) => setSelectedMembers({...selectedMembers, [u.userId]: {...selectedMembers[u.userId], facilityId: e.target.value}})}
                                  placeholder="Optional site"
                                  className="h-8 w-full rounded-lg bg-card border border-border px-2 text-[10px] font-bold"
                                />
                             </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
               </div>
            </div>
            
            <Card padding="md" className="bg-muted/10 h-fit border-border/60">
               <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Composition Preview</h3>
               <div className="space-y-4">
                  <div className="p-3 bg-card border border-border rounded-xl">
                      <p className="text-xs font-bold text-foreground truncate">{teamName || 'Undefined Team'}</p>
                      <p className="text-[10px] text-primary font-bold uppercase mt-1 tracking-tight">{Object.keys(selectedMembers).length} Active Members</p>
                  </div>
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                     <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold leading-relaxed">Clinician selection is restricted to the current tenant pool. Dynamic invites are not yet enabled.</p>
                  </div>
               </div>
            </Card>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!teamName || mutation.isPending}>
            {isEditing ? 'Finalize Changes' : 'Initialize Team'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CareTeamPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ApiNamedCareTeam | null>(null);

  const queryClient = useQueryClient();
  const { data: teams = [], isLoading: teamsLoading } = useQuery({ queryKey: ['care-team-teams'], queryFn: fetchNamedCareTeams });
  const { data: roles = [], isLoading: rolesLoading } = useQuery({ queryKey: ['care-team-roles'], queryFn: fetchCareTeamRoles });

  const filtered = useMemo(() => teams.filter((t) => {
    const rMatch = roleFilter === 'ALL' || t.members.some((m) => m.roleCode === roleFilter);
    const q = search.trim().toLowerCase();
    const sMatch = !q || t.name.toLowerCase().includes(q) || t.members.some((m) => formatPersonName(m).toLowerCase().includes(q));
    return rMatch && sMatch;
  }), [teams, roleFilter, search]);

  return (
    <div className="space-y-6 pb-10">
       <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:flex-1">
          <Input placeholder="Search named care teams and clinician associations…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex w-full sm:w-auto gap-2">
           <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setShowModal(true)} block className="sm:w-auto">Define Care Team</Button>
        </div>
      </div>

      <div className="flex gap-1.5 bg-muted/40 p-1 rounded-2xl w-fit flex-wrap border border-border/50">
        <button onClick={() => setRoleFilter('ALL')} className={cn("px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", roleFilter === 'ALL' ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground")}>
          Global View
        </button>
        {roles.map((r) => (
          <button key={r.code} onClick={() => setRoleFilter(r.code)} className={cn("px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", roleFilter === r.code ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground")}>
            {r.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teamsLoading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 bg-card rounded-3xl border border-border animate-pulse" />
        )) : filtered.map((t) => {
           const uniqueRoles = Array.from(new Set(t.members.map(m => m.roleName)));
           return (
            <Card key={t.id} hover className="border-border/60 group p-5">
               <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="h-5 w-5" />
                     </div>
                     <div>
                        <h4 className="font-bold text-foreground font-display line-clamp-1">{t.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 opacity-60">{t.memberCount} clinicians assigned</p>
                     </div>
                  </div>
                  <Button variant="ghost" size="xs" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditingTeam(t)} />
               </div>
               <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 h-8">{t.description || 'No specialized description provided for this assembly.'}</p>
               <div className="mt-5 pt-5 border-t border-border/40 flex flex-wrap gap-1.5">
                  {uniqueRoles.map(r => <Badge key={r} variant="neutral" size="xs">{r}</Badge>)}
               </div>
            </Card>
           );
        })}
      </div>

      <AnimatePresence>
        {showModal && <CareTeamModal roles={roles} onClose={() => setShowModal(false)} />}
        {editingTeam && <CareTeamModal team={editingTeam} roles={roles} onClose={() => setEditingTeam(null)} />}
      </AnimatePresence>
    </div>
  );
}
