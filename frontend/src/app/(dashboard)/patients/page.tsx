'use client';

import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  AlertCircle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, 
  Loader2, PlayCircle, Search, X, Users, Activity,
  Clock, Calendar, FileText, MoreHorizontal, UserPlus
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { RiskBadge, StatusBadge, Badge } from '@/components/ui/Badge';
import { fetchPatients, type ApiPatientListItem } from '@/services/patients.service';
import {
  fetchStageHistory,
  fetchTransitionReadiness,
  startEnrollment,
  transitionEnrollment,
} from '@/services/enrollments.service';
import {
  completeTask,
  fetchEnrollmentTasks,
  reassignTask,
  type ApiTask,
} from '@/services/tasks.service';
import { fetchUsers } from '@/services/users.service';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type SortKey = 'name' | 'riskLevel' | 'openTasks' | 'lastActivityAt';
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const RISK_ORDER: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const STATUS_FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'WITHDRAWN'];

function formatDateLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function ProgressDrawer({
  patient,
  enrollment,
  onClose,
}: {
  patient: ApiPatientListItem;
  enrollment: ApiPatientListItem['enrollments'][number];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const tasksQuery = useQuery({
    queryKey: ['enrollment-tasks', enrollment.enrollmentId, enrollment.currentStage.id],
    queryFn: () => fetchEnrollmentTasks(enrollment.enrollmentId, { stageId: enrollment.currentStage.id, limit: 100 }),
    enabled: enrollment.status === 'active',
  });

  const readinessQuery = useQuery({
    queryKey: ['transition-readiness', enrollment.enrollmentId],
    queryFn: () => fetchTransitionReadiness(enrollment.enrollmentId),
    enabled: enrollment.status === 'active',
  });

  const historyQuery = useQuery({
    queryKey: ['stage-history', enrollment.enrollmentId],
    queryFn: () => fetchStageHistory(enrollment.enrollmentId),
  });

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => completeTask(taskId, { completionMethod: 'manual', completionNotes: 'Completed from Patient Pathway progress' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enrollment-tasks', enrollment.enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['transition-readiness', enrollment.enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['patients'] }),
      ]);
    },
  });

  const reassignMutation = useMutation({
    mutationFn: ({ task, userId }: { task: ApiTask; userId: string }) => reassignTask(task.id, {
      assignedToUserId: userId || null,
      assignedToRole: userId ? null : task.assignedToRole ?? null,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['enrollment-tasks', enrollment.enrollmentId] });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: (toStageId: string) => transitionEnrollment(enrollment.enrollmentId, { toStageId, reason: 'Manual transition' }),
    onSuccess: async () => {
      setTransitionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patients'] }),
        queryClient.invalidateQueries({ queryKey: ['enrollment-tasks', enrollment.enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['transition-readiness', enrollment.enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['stage-history', enrollment.enrollmentId] }),
      ]);
      onClose();
    },
    onError: (err: any) => setTransitionError(err?.response?.data?.message ?? 'Movement failed.'),
  });

  const tasks = tasksQuery.data?.data ?? [];
  const readiness = readinessQuery.data;
  const nextStage = readiness?.nextStages?.[0];
  const users = usersQuery.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-card shadow-2xl border-l border-border">
        <div className="flex items-start justify-between border-b border-border bg-muted/20 px-6 py-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Patient Pathway Case</p>
            <h2 className="text-xl font-bold text-foreground font-display leading-tight">{enrollment.pathwayName}</h2>
            <p className="mt-1.5 text-xs text-muted-foreground font-medium flex items-center gap-2">
              <span className="font-bold text-foreground/80">{patient.name}</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>{patient.mrn || patient.id}</span>
            </p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
          <Card padding="sm" className="bg-primary/5 border-primary/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Current Milestones</p>
                <p className="text-lg font-bold text-foreground font-display">{enrollment.currentStage.name}</p>
                <div className="flex items-center gap-2 mt-1">
                   <Badge variant="neutral" size="xs">{enrollment.currentStage.code}</Badge>
                   <span className="h-1 w-1 rounded-full bg-border" />
                   <span className="text-[10px] font-bold text-muted-foreground uppercase">{enrollment.currentStage.stageType}</span>
                </div>
              </div>
              <StatusBadge status={enrollment.status.toUpperCase()} />
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden border-border/60">
            <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground font-display">Active Interventions</h3>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Clinical tasks for the current stage</p>
              </div>
              {tasksQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            <div className="divide-y divide-border/40">
              {tasks.length === 0 && !tasksQuery.isLoading ? (
                <div className="p-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground font-medium">All stage objectives completed.</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground leading-snug">{task.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                           <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {formatDateLabel(task.dueDate)}</span>
                           <span className="h-1 w-1 rounded-full bg-border" />
                           <span>{task.assignedToRole || 'Unassigned Role'}</span>
                        </div>
                      </div>
                      <StatusBadge status={task.status.toUpperCase()} />
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border/20">
                      <select
                        value={task.assignedToUserId ?? ''}
                        onChange={(ev) => reassignMutation.mutate({ task, userId: ev.target.value })}
                        disabled={reassignMutation.isPending || task.status === 'completed'}
                        className="h-8 rounded-lg border border-border bg-muted/30 px-2 text-[11px] font-bold focus:ring-2 focus:ring-primary/20 transition max-w-[180px]"
                      >
                        <option value="">Assign clinician...</option>
                        {users.map((u) => <option key={u.userId} value={u.userId}>{u.displayName || u.email}</option>)}
                      </select>
                      <Button
                        size="xs"
                        variant={task.status === 'completed' ? 'outline' : 'primary'}
                        disabled={task.status === 'completed' || completeMutation.isPending}
                        onClick={() => completeMutation.mutate(task.id)}
                        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      >
                        {task.status === 'completed' ? 'Verified' : 'Complete Task'}
                      </Button>
                    </div>
                  </div>
                )
              ))}
            </div>
          </Card>

          <Card padding="glass" className="border-border shadow-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground font-display">Path Progress</h3>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 max-w-xs">{readiness?.reason || 'Movement available after intervention completion.'}</p>
                {transitionError && <p className="mt-2 text-xs text-red-500 bg-red-500/10 p-2 rounded-lg">{transitionError}</p>}
              </div>
              <Button
                disabled={!readiness?.canTransition || !nextStage || transitionMutation.isPending}
                loading={transitionMutation.isPending}
                onClick={() => nextStage && transitionMutation.mutate(nextStage.id)}
                iconRight={<ArrowRight className="h-4 w-4" />}
                size="sm"
              >
                {nextStage ? `Next: ${nextStage.name}` : 'Stay in Stage'}
              </Button>
            </div>
            {readiness && readiness.blockingTaskCount > 0 && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                 <AlertCircle className="h-4 w-4 text-amber-500" />
                 <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight">
                  {readiness.blockingTaskCount} mandatory intervention{readiness.blockingTaskCount === 1 ? '' : 's'} remaining.
                 </p>
              </div>
            )}
          </Card>

          <div className="space-y-4">
             <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Stage Lifecycle History</h3>
             <div className="relative space-y-4">
                <div className="absolute left-[13px] top-6 bottom-6 w-0.5 bg-border/40" />
                {(historyQuery.data ?? []).map((item, i) => (
                  <div key={item.id} className="relative pl-8">
                     <div className="absolute left-0 h-[28px] w-[28px] rounded-lg bg-muted border border-border flex items-center justify-center z-10">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                     </div>
                     <div className="bg-muted/10 border border-border/50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-foreground">
                          {item.fromStageName ? `${item.fromStageName} → ${item.toStageName}` : `Enrolled: ${item.toStageName}`}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-70">
                           <span>{item.transitionType}</span>
                           <span className="h-0.5 w-0.5 rounded-full bg-border" />
                           <span>{formatDateLabel(item.transitionedAt)}</span>
                           {item.performedBy && <><span className="h-0.5 w-0.5 rounded-full bg-border" /><span>{item.performedBy}</span></>}
                        </div>
                        {item.reason && <p className="mt-2 text-xs text-muted-foreground border-l-2 border-border pl-2 italic">{item.reason}</p>}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('lastActivityAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedProgress, setSelectedProgress] = useState<{
    patient: ApiPatientListItem;
    enrollment: ApiPatientListItem['enrollments'][number];
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading, isError, error } = useQuery({
    queryKey: ['patients', search, statusFilter],
    queryFn: () => fetchPatients({ q: search.trim() || undefined, status: statusFilter === 'ALL' ? undefined : statusFilter }),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => startEnrollment(id),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['patients'] }); },
  });

  const filtered = useMemo(() => {
    const list = [...patients];
    list.sort((a, b) => {
      let c = 0;
      if (sortKey === 'name') c = a.name.localeCompare(b.name);
      else if (sortKey === 'riskLevel') c = RISK_ORDER[a.riskLevel as RiskLevel] - RISK_ORDER[b.riskLevel as RiskLevel];
      else if (sortKey === 'openTasks') c = a.openTasks - b.openTasks;
      else if (sortKey === 'lastActivityAt') c = (new Date(a.lastActivityAt || 0).getTime()) - (new Date(b.lastActivityAt || 0).getTime());
      return sortDir === 'asc' ? c : -c;
    });
    return list;
  }, [patients, sortDir, sortKey]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:flex-1">
          <Input placeholder="Search clinicians, roles, or email…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex w-full sm:w-auto gap-2">
           <Button icon={<UserPlus className="h-4 w-4" />} block className="sm:w-auto">Register Patient</Button>
        </div>
      </div>

      <div className="flex gap-1.5 bg-muted/40 p-1 rounded-2xl w-fit flex-wrap border border-border/50">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
              statusFilter === s ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 font-bold">
          <AlertCircle className="h-5 w-5" />
          {(error as any)?.response?.data?.message ?? 'Network error accessing patient data.'}
        </div>
      )}

      <Card padding="none" className="overflow-hidden border-border/60">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {[
                  { label: 'Patient Name', key: 'name' },
                  { label: 'Clinical Status', key: null },
                  { label: 'Risk Intensity', key: 'riskLevel' },
                  { label: 'Active Pathways', key: null },
                  { label: 'Coordinator', key: null },
                  { label: 'Due Actions', key: 'openTasks' },
                  { label: 'Activity', key: 'lastActivityAt' },
                  { label: 'Controls', key: null },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    className={cn(
                      "px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap",
                      key && "cursor-pointer hover:text-foreground transition-colors"
                    )}
                    onClick={() => key && setSortDir(sortKey === key && sortDir === 'desc' ? 'asc' : 'desc')}
                  >
                    <div className="flex items-center gap-1.5">
                      {label}
                      {key === sortKey && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, c) => (
                      <td key={c} className="px-5 py-6">
                        <div className="h-4 bg-muted rounded w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.map((p) => (
                <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-bold text-foreground font-display truncate">{p.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-tighter">{p.mrn || p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-4"><RiskBadge level={p.riskLevel} /></td>
                  <td className="px-5 py-4 min-w-[200px]">
                    <div className="flex flex-wrap gap-1.5">
                      {p.enrollments?.map((e) => (
                        <div key={e.enrollmentId} className="px-2 py-1 rounded-lg bg-primary/5 border border-primary/20 flex flex-col max-w-[180px]">
                            <span className="text-[10px] font-bold text-foreground truncate">{e.pathwayName}</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight opacity-70">
                              {e.status === 'active' ? e.currentStage.name : e.status}
                            </span>
                        </div>
                      ))}
                      {!p.enrollments?.length && <span className="text-xs text-muted-foreground italic">No active enrollments</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {p.assignedCareCoordinator ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={p.assignedCareCoordinator} size="xs" />
                        <span className="text-foreground/80 text-[11px] font-bold truncate">
                          {p.assignedCareCoordinator}
                        </span>
                      </div>
                    ) : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-xs font-bold", p.overdueTasks > 0 ? "text-red-500" : p.openTasks > 0 ? "text-amber-500" : "text-foreground/60")}>
                        {p.openTasks}
                      </p>
                      {p.overdueTasks > 0 && <Badge variant="danger" size="xs">{p.overdueTasks}!</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-tight whitespace-nowrap">
                    {formatDateLabel(p.lastActivityAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                       {p.enrollments?.[0] && (
                        <Button size="xs" variant="outline" onClick={() => setSelectedProgress({ patient: p, enrollment: p.enrollments[0] })}>
                          Monitor
                        </Button>
                       )}
                       <Button size="xs" variant="ghost" icon={<MoreHorizontal className="h-4 w-4" />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <span>Active Registry: {filtered.length} Patients Enrolled</span>
        </div>
      </Card>

      <AnimatePresence>
        {selectedProgress && (
          <ProgressDrawer
            patient={selectedProgress.patient}
            enrollment={selectedProgress.enrollment}
            onClose={() => setSelectedProgress(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
