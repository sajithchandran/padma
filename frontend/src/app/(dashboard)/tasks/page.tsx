'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Plus, Clock, AlertCircle, UserCheck, X, 
  LayoutDashboard, List, Calendar, ChevronRight, 
  ArrowRight, MoreHorizontal, CheckCircle2,
  User, Route, Activity
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge, PriorityBadge, Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import type { TaskStatus } from '@/types';
import { fetchTask, fetchTasks, reassignTask, updateTaskStatus, type ApiTask } from '@/services/tasks.service';
import { fetchUsers, type ApiUserMembership } from '@/services/users.service';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string; bg: string }[] = [
  { status: 'PENDING',     label: 'Pending',     color: 'border-amber-500', bg: 'bg-amber-500/10' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-sapphire-500', bg: 'bg-sapphire-500/10' },
  { status: 'OVERDUE',     label: 'Overdue',     color: 'border-red-500', bg: 'bg-red-500/10' },
  { status: 'COMPLETED',   label: 'Completed',   color: 'border-emerald-500', bg: 'bg-emerald-500/10' },
];

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
const EDITABLE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

type ViewTask = {
  id: string;
  title: string;
  patientName?: string;
  pathwayName?: string;
  assignedTo?: string;
  assignedToUserId?: string | null;
  assignedToRole?: string | null;
  dueDate: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: TaskStatus;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapPriority(priority: number, isCritical?: boolean) {
  if (isCritical || priority <= 0) return 'URGENT' as const;
  if (priority === 1) return 'HIGH' as const;
  if (priority === 2) return 'NORMAL' as const;
  return 'LOW' as const;
}

function mapStatus(task: ApiTask): TaskStatus {
  const rawStatus = task.status.toUpperCase();
  if (rawStatus === 'ACTIVE' || rawStatus === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (rawStatus === 'COMPLETED' || rawStatus === 'AUTO_COMPLETED') return 'COMPLETED';
  if (rawStatus === 'OVERDUE') return 'OVERDUE';
  if (rawStatus === 'PENDING' || rawStatus === 'UPCOMING') {
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(due.getTime()) && due < today) return 'OVERDUE';
    return 'PENDING';
  }
  return 'PENDING';
}

function formatDueDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

// ─── Task Detail Drawer ───────────────────────────────────────────────────────

function TaskDetailDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [nextStatus, setNextStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const taskQuery = useQuery({ queryKey: ['task', taskId], queryFn: () => fetchTask(taskId) });

  const statusMutation = useMutation({
    mutationFn: () => updateTaskStatus(taskId, {
      status: nextStatus as any,
      completionNotes: notes.trim() || undefined,
      completionMethod: nextStatus === 'completed' ? 'manual' : undefined,
    }),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['patients'] }),
      ]);
      setNotes('');
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Update failed.'),
  });

  const task = taskQuery.data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="relative flex h-full w-full max-w-xl flex-col bg-card shadow-2xl border-l border-border">
        <div className="flex items-start justify-between border-b border-border bg-muted/20 px-6 py-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Intervention Details</p>
            <h2 className="text-xl font-bold text-foreground font-display leading-tight">{task?.title ?? 'Intervention'}</h2>
            {task?.patientDisplayName && <p className="mt-1 text-sm text-muted-foreground font-medium">{task.patientDisplayName}</p>}
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
          {taskQuery.isLoading ? (
             <div className="p-8 rounded-2xl bg-muted/20 border border-border animate-pulse" />
          ) : !task ? (
             <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-bold text-center">Intervention not found.</div>
          ) : (
            <>
              <Card padding="md" className="space-y-6 border-border/60">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Stage Status</p>
                    <StatusBadge status={mapStatus(task)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Priority Path</p>
                    <PriorityBadge priority={mapPriority(task.priority, task.isCritical)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Due Horizon</p>
                    <p className="text-sm font-bold text-foreground flex items-center gap-2"><Calendar className="h-4 w-4 opacity-50" /> {formatDueDate(task.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Assigned Scope</p>
                    <div className="flex items-center gap-2">
                       <Avatar name={task.assignedToUserId || task.assignedToRole || 'Unassigned'} size="xs" />
                       <p className="text-sm font-bold text-foreground">{task.assignedToUserId || task.assignedToRole || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>
                {task.description && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                     <p className="text-xs text-foreground/80 leading-relaxed italic">{task.description}</p>
                  </div>
                )}
              </Card>

              <Card padding="md" className="border-primary/20 bg-primary/5">
                <h3 className="text-sm font-bold text-foreground font-display flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Mark Objective Complete
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">New Lifecycle Status</label>
                    <select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value)}
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition"
                    >
                      <option value="">Update status…</option>
                      {EDITABLE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Notes / Rationale</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Add clinical context for this transition…"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition resize-none"
                    />
                  </div>
                  {error && <p className="text-xs font-bold text-red-500 pl-1">{error}</p>}
                  <Button 
                    block
                    disabled={!nextStatus || statusMutation.isPending}
                    loading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate()}
                  >
                    Transition Workflow
                  </Button>
                </div>
              </Card>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Intervention Timeline</h3>
                <div className="relative space-y-4">
                  <div className="absolute left-[13px] top-6 bottom-6 w-0.5 bg-border/40" />
                  {(task.taskEvents ?? []).map((e, i) => (
                    <div key={e.id} className="relative pl-8">
                       <div className="absolute left-0 h-[28px] w-[28px] rounded-lg bg-muted border border-border flex items-center justify-center z-10 transition-transform group-hover:scale-110">
                          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                       </div>
                       <div className="bg-muted/10 border border-border/40 rounded-2xl p-4">
                          <p className="text-xs font-bold text-foreground">{e.eventType}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-70">
                             <span>{e.fromStatus || 'Start'} → {e.toStatus || 'End'}</span>
                             <span className="h-0.5 w-0.5 rounded-full bg-border" />
                             <span>{formatDueDate(e.createdAt)}</span>
                             {e.performedBy && <><span className="h-0.5 w-0.5 rounded-full bg-border" /><span>{e.performedBy}</span></>}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const filter = searchParams.get('filter');
  const currentUserId = typeof window !== 'undefined' ? sessionStorage.getItem('padma_user_id') : null;

  const { data: resp, isLoading, isError, error } = useQuery({
    queryKey: ['tasks', filter, currentUserId],
    queryFn: () => fetchTasks({ assignedToUserId: filter === 'mine' ? currentUserId ?? undefined : undefined, limit: 100 }),
  });

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers, enabled: filter === 'team' });

  const reassignMutation = useMutation({
    mutationFn: (p: { taskId: string; assignedToUserId?: string | null; assignedToRole?: string | null }) => reassignTask(p.taskId, { assignedToUserId: p.assignedToUserId, assignedToRole: p.assignedToRole }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['tasks'] }); },
  });

  const tasks = useMemo<ViewTask[]>(() => (resp?.data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    patientName: task.patientDisplayName ?? undefined,
    pathwayName: task.interventionTemplate?.name ?? undefined,
    assignedTo: task.assignedToUserId === currentUserId ? 'Me' : (task.assignedToRole || task.assignedToUserId || undefined),
    assignedToUserId: task.assignedToUserId,
    assignedToRole: task.assignedToRole,
    dueDate: formatDueDate(task.dueDate),
    priority: mapPriority(task.priority, task.isCritical),
    status: mapStatus(task),
  })), [resp?.data, currentUserId]);

  const filtered = useMemo(() => tasks.filter((t) => {
    const q = search.toLowerCase();
    return !q || t.title.toLowerCase().includes(q) || t.patientName?.toLowerCase().includes(q);
  }), [tasks, search]);

  return (
    <div className="space-y-6 pb-10">
      {/* Search & Tool View Swapper */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:flex-1">
          <Input placeholder="Filter clinical objectives, patients, or pathways…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="flex bg-muted/50 p-1.5 rounded-2xl gap-1 border border-border/50">
            {[ 
              { id: 'kanban', icon: <LayoutDashboard className="h-4 w-4" /> },
              { id: 'list',   icon: <List className="h-4 w-4" /> }
            ].map((v) => (
              <button key={v.id} onClick={() => setView(v.id as any)}
                className={cn(
                  "flex items-center justify-center p-1.5 rounded-xl transition-all",
                  view === v.id ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:bg-muted"
                )}>
                {v.icon}
              </button>
            ))}
          </div>
          <Button icon={<Plus className="h-4 w-4" />} block className="sm:w-auto">Ad-hoc Task</Button>
        </div>
      </div>

      {/* Kanban Board */}
      <AnimatePresence mode="wait">
        {view === 'kanban' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
            {STATUS_COLUMNS.map((col) => {
              const colTasks = filtered.filter((t) => t.status === col.status).sort((a,b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
              return (
                <div key={col.status} className="flex flex-col gap-4">
                  <div className={cn("flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/20 border-l-4 border border-border shadow-sm", col.color)}>
                    <span className="text-xs font-bold text-foreground uppercase tracking-widest">{col.label}</span>
                    <Badge variant="neutral" size="xs" className="font-black">{colTasks.length}</Badge>
                  </div>
                  <div className="space-y-4">
                    {colTasks.map((t) => (
                      <Card key={t.id} hover onClick={() => setSelectedTaskId(t.id)} className="cursor-pointer group border-border/60 hover:border-primary/30 p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <PriorityBadge priority={t.priority} />
                          {t.priority === 'URGENT' && <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />}
                        </div>
                        <h4 className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors font-display line-clamp-2">{t.title}</h4>
                        <div className="mt-3 space-y-1">
                           {t.patientName && <p className="text-[11px] font-bold text-muted-foreground opacity-80 flex items-center gap-1.5"><User className="h-3 w-3" /> {t.patientName}</p>}
                           {t.pathwayName && <p className="text-[10px] font-medium text-muted-foreground opacity-60 flex items-center gap-1.5"><Route className="h-3 w-3" /> {t.pathwayName}</p>}
                        </div>
                        <div className="mt-5 flex items-center justify-between pt-4 border-t border-border/40">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                            <Clock className="h-3.5 w-3.5" />
                            {t.dueDate}
                          </div>
                          <Avatar name={t.assignedTo || 'Unassigned'} size="xs" className="ring-2 ring-card group-hover:ring-primary/10 transition-all" />
                        </div>
                      </Card>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 rounded-3xl border border-dashed border-border bg-muted/10 opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Empty Col</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card padding="none" className="overflow-hidden border-border/60">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {['Objective', 'Patient Scope', 'Intensity', 'Lifecycle', 'Due Date', 'Assignee'].map((h) => (
                        <th key={h} className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filtered.map((t) => (
                      <tr key={t.id} onClick={() => setSelectedTaskId(t.id)} className="hover:bg-muted/10 transition-colors cursor-pointer group">
                        <td className="px-5 py-5 max-w-[300px]">
                          <p className="text-sm font-bold text-foreground font-display leading-tight flex items-center gap-2">
                             {t.title}
                             {t.priority === 'URGENT' && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1 opacity-60">{t.pathwayName || 'Organic Task'}</p>
                        </td>
                        <td className="px-5 py-5 text-balance">
                           <p className="text-xs font-bold text-foreground/80">{t.patientName ?? 'Global Context'}</p>
                        </td>
                        <td className="px-5 py-5"><PriorityBadge priority={t.priority} /></td>
                        <td className="px-5 py-5"><StatusBadge status={t.status} /></td>
                        <td className="px-5 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-tight whitespace-nowrap">{t.dueDate}</td>
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-3">
                            <Avatar name={t.assignedTo || 'U'} size="xs" />
                            <span className="text-[11px] font-bold text-foreground/80">{t.assignedTo ?? 'Unassigned'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTaskId && <TaskDetailDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
      </AnimatePresence>
    </div>
  );
}
