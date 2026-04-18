'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Loader2,
  Route,
} from 'lucide-react';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { CareChatPanel } from '@/components/patients/CareChatPanel';
import { PatientPathwayDiagram } from '@/components/patients/PatientPathwayDiagram';
import type { ApiPatientListItem } from '@/services/patients.service';
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

function formatDateLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function PatientPathwayMonitorContent({
  patient,
  enrollment,
}: {
  patient: ApiPatientListItem;
  enrollment: ApiPatientListItem['enrollments'][number];
}) {
  const queryClient = useQueryClient();
  const patientId = patient.id;
  const enrollmentId = enrollment.enrollmentId;
  const isActive = enrollment.status === 'active';

  const tasksQuery = useQuery({
    queryKey: ['enrollment-tasks', enrollmentId, enrollment.currentStage.id],
    queryFn: () => fetchEnrollmentTasks(enrollmentId, { stageId: enrollment.currentStage.id, limit: 100 }),
    enabled: isActive,
  });

  const readinessQuery = useQuery({
    queryKey: ['transition-readiness', enrollmentId],
    queryFn: () => fetchTransitionReadiness(enrollmentId),
    enabled: isActive,
  });

  const historyQuery = useQuery({
    queryKey: ['stage-history', enrollmentId],
    queryFn: () => fetchStageHistory(enrollmentId),
  });

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const startMutation = useMutation({
    mutationFn: () => startEnrollment(enrollmentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patients'] }),
        queryClient.invalidateQueries({ queryKey: ['patient', patientId] }),
        queryClient.invalidateQueries({ queryKey: ['enrollment-tasks', enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['stage-history', enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['care-chat', enrollmentId] }),
      ]);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => completeTask(taskId, {
      completionMethod: 'manual',
      completionNotes: 'Completed from Patient Pathway monitor',
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patients'] }),
        queryClient.invalidateQueries({ queryKey: ['patient', patientId] }),
        queryClient.invalidateQueries({ queryKey: ['enrollment-tasks', enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['transition-readiness', enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['care-chat', enrollmentId] }),
      ]);
    },
  });

  const reassignMutation = useMutation({
    mutationFn: ({ task, userId }: { task: ApiTask; userId: string }) => reassignTask(task.id, {
      assignedToUserId: userId || null,
      assignedToRole: userId ? null : task.assignedToRole ?? null,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enrollment-tasks', enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['care-chat', enrollmentId] }),
      ]);
    },
  });

  const transitionMutation = useMutation({
    mutationFn: (toStageId: string) => transitionEnrollment(enrollmentId, { toStageId, reason: 'Manual transition' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patients'] }),
        queryClient.invalidateQueries({ queryKey: ['patient', patientId] }),
        queryClient.invalidateQueries({ queryKey: ['enrollment-tasks', enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['transition-readiness', enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['stage-history', enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ['care-chat', enrollmentId] }),
      ]);
    },
  });

  const tasks = tasksQuery.data?.data ?? [];
  const readiness = readinessQuery.data;
  const nextStage = readiness?.nextStages?.[0];
  const users = usersQuery.data ?? [];
  const completionPercent = enrollment.totalTasks > 0
    ? Math.round((enrollment.completedTasks / enrollment.totalTasks) * 100)
    : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-6">
        <Card padding="glass" className="border-border shadow-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary">Selected Pathway</p>
              <h2 className="font-display text-xl font-black text-foreground">{enrollment.pathwayName}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={enrollment.status.toUpperCase()} />
                <Badge variant="neutral" size="sm">{enrollment.currentStage.name}</Badge>
                <Badge variant="neutral" size="sm">{enrollment.currentStage.code}</Badge>
              </div>
            </div>
            {enrollment.canStart ? (
              <Button
                loading={startMutation.isPending}
                onClick={() => startMutation.mutate()}
                icon={<Route className="h-4 w-4" />}
              >
                Start Pathway
              </Button>
            ) : (
              <div className="min-w-[220px]">
                <Progress value={completionPercent} label="Task Completion" showLabel />
              </div>
            )}
          </div>
        </Card>

        <PatientPathwayDiagram
          pathwayId={enrollment.pathwayId}
          currentStageId={enrollment.currentStage.id}
          status={enrollment.status}
          stageHistory={historyQuery.data ?? []}
        />

        <Card padding="none" className="overflow-hidden border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-4">
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">Active Interventions</h3>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Clinical tasks for the current stage</p>
            </div>
            {tasksQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>

          <div className="divide-y divide-border/40">
            {!isActive ? (
              <div className="p-10 text-center">
                <Route className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs font-medium text-muted-foreground">Start the pathway to generate stage interventions.</p>
              </div>
            ) : tasks.length === 0 && !tasksQuery.isLoading ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500 opacity-40" />
                <p className="text-xs font-medium text-muted-foreground">All stage objectives completed.</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="p-4 transition-colors hover:bg-muted/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-snug text-foreground">{task.title}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {formatDateLabel(task.dueDate)}</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span>{task.assignedToRole || 'Unassigned Role'}</span>
                      </div>
                    </div>
                    <StatusBadge status={task.status.toUpperCase()} />
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-border/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <select
                      value={task.assignedToUserId ?? ''}
                      onChange={(event) => reassignMutation.mutate({ task, userId: event.target.value })}
                      disabled={reassignMutation.isPending || task.status === 'completed'}
                      className="h-8 max-w-[220px] rounded-lg border border-border bg-muted/30 px-2 text-[11px] font-bold transition focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Assign clinician...</option>
                      {users.map((user) => <option key={user.userId} value={user.userId}>{user.displayName || user.email}</option>)}
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
              ))
            )}
          </div>
        </Card>

        <Card padding="glass" className="border-border shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">Path Progress</h3>
              <p className="mt-0.5 max-w-xl text-[10px] font-medium text-muted-foreground">
                {readiness?.reason || (isActive ? 'Movement available after intervention completion.' : 'Start the pathway before moving stages.')}
              </p>
              {transitionMutation.isError && (
                <p className="mt-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-500">
                  {(transitionMutation.error as any)?.response?.data?.message ?? 'Movement failed.'}
                </p>
              )}
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
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <p className="text-[11px] font-bold uppercase tracking-tight text-amber-600">
                {readiness.blockingTaskCount} mandatory intervention{readiness.blockingTaskCount === 1 ? '' : 's'} remaining.
              </p>
            </div>
          )}
        </Card>

        <Card padding="none" className="overflow-hidden border-border/60">
          <div className="border-b border-border/60 bg-muted/20 px-5 py-4">
            <h3 className="font-display text-sm font-bold text-foreground">Stage Lifecycle History</h3>
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Start and transition audit trail</p>
          </div>
          <div className="space-y-4 p-5">
            {(historyQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No stage history recorded yet.</p>
            ) : (
              <div className="relative space-y-4">
                <div className="absolute bottom-6 left-[13px] top-6 w-0.5 bg-border/40" />
                {(historyQuery.data ?? []).map((item) => (
                  <div key={item.id} className="relative pl-8">
                    <div className="absolute left-0 z-10 flex h-[28px] w-[28px] items-center justify-center rounded-lg border border-border bg-muted">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
                      <p className="text-sm font-bold text-foreground">
                        {item.fromStageName ? `${item.fromStageName} -> ${item.toStageName}` : `Started: ${item.toStageName}`}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground opacity-70">
                        <span>{item.transitionType}</span>
                        <span className="h-0.5 w-0.5 rounded-full bg-border" />
                        <span>{formatDateLabel(item.transitionedAt)}</span>
                      </div>
                      {item.reason && <p className="mt-2 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">{item.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <CareChatPanel enrollmentId={enrollmentId} patientName={patient.name} />
      </div>
    </div>
  );
}
