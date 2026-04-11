'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Loader2, PlayCircle, Search, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { RiskBadge, StatusBadge } from '@/components/ui/Badge';
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

type SortKey = 'name' | 'riskLevel' | 'openTasks' | 'lastActivityAt';
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const RISK_ORDER: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const STATUS_FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'WITHDRAWN'];

function formatDateLabel(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function pathwaySummary(patient: ApiPatientListItem) {
  if (patient.currentPathways.length === 0) return '—';
  if (patient.currentPathways.length <= 2) return patient.currentPathways.join(', ');
  return `${patient.currentPathways.slice(0, 2).join(', ')} +${patient.currentPathways.length - 2} more`;
}

function enrollmentStatusLabel(status: string) {
  if (status === 'pending') return 'Not started';
  if (status === 'active') return 'In progress';
  return status.replace('_', ' ');
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
    queryFn: () => fetchEnrollmentTasks(enrollment.enrollmentId, {
      stageId: enrollment.currentStage.id,
      limit: 100,
    }),
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

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => completeTask(taskId, {
      completionMethod: 'manual',
      completionNotes: 'Completed from Patient Pathway progress',
    }),
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
    mutationFn: (toStageId: string) => transitionEnrollment(enrollment.enrollmentId, {
      toStageId,
      reason: 'Moved from Patient Pathway progress after completing current-stage tasks',
    }),
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
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setTransitionError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Unable to move to the next stage.'));
    },
  });

  const tasks = tasksQuery.data?.data ?? [];
  const readiness = readinessQuery.data;
  const nextStage = readiness?.nextStages?.[0];
  const users = usersQuery.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient Pathway</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{enrollment.pathwayName}</h2>
            <p className="mt-1 text-sm text-slate-500">{patient.name} · {patient.mrn || patient.id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-500">Current stage</p>
                <p className="text-base font-semibold text-slate-900">{enrollment.currentStage.name}</p>
                <p className="text-xs text-slate-400">{enrollment.currentStage.code} · {enrollment.currentStage.stageType}</p>
              </div>
              <StatusBadge status={enrollment.status.toUpperCase()} />
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Current Stage Tasks</h3>
                <p className="text-xs text-slate-500">Generated from interventions associated with this stage</p>
              </div>
              {tasksQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>

            {tasks.length === 0 && !tasksQuery.isLoading ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No tasks are available for this stage.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{task.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Due {formatDateLabel(task.dueDate)} · {task.assignedToRole || 'No role'}
                        </p>
                      </div>
                      <StatusBadge status={task.status.toUpperCase()} />
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <select
                        value={task.assignedToUserId ?? ''}
                        onChange={(event) => reassignMutation.mutate({ task, userId: event.target.value })}
                        disabled={reassignMutation.isPending || task.status === 'completed'}
                        className="h-9 rounded-lg border border-slate-300 px-2 text-xs"
                      >
                        <option value="">Assign to user...</option>
                        {users.map((user) => (
                          <option key={`${user.userId}-${user.roleId}`} value={user.userId}>
                            {user.displayName || user.email} ({user.roleName})
                          </option>
                        ))}
                      </select>
                      <Button
                        size="xs"
                        variant={task.status === 'completed' ? 'outline' : 'primary'}
                        disabled={task.status === 'completed' || completeMutation.isPending}
                        onClick={() => completeMutation.mutate(task.id)}
                        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      >
                        {task.status === 'completed' ? 'Completed' : 'Complete'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Stage Movement</h3>
                <p className="text-xs text-slate-500">
                  {readiness?.reason || 'Move after all current-stage tasks are completed.'}
                </p>
                {transitionError && <p className="mt-2 text-xs text-red-600">{transitionError}</p>}
              </div>
              <Button
                disabled={!readiness?.canTransition || !nextStage || transitionMutation.isPending}
                loading={transitionMutation.isPending}
                onClick={() => nextStage && transitionMutation.mutate(nextStage.id)}
                icon={<ArrowRight className="h-4 w-4" />}
              >
                {nextStage ? `Move to ${nextStage.name}` : 'No next stage'}
              </Button>
            </div>
            {readiness && readiness.blockingTaskCount > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {readiness.blockingTaskCount} task{readiness.blockingTaskCount === 1 ? '' : 's'} must be completed before movement.
              </p>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900">History / Audit</h3>
            <div className="mt-3 space-y-3">
              {(historyQuery.data ?? []).map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-900">
                    {item.fromStageName ? `${item.fromStageName} -> ${item.toStageName}` : `Started at ${item.toStageName}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.transitionType} · {formatDateLabel(item.transitionedAt)}
                    {item.performedBy ? ` · by ${item.performedBy}` : ''}
                  </p>
                  {item.reason && <p className="mt-1 text-xs text-slate-500">{item.reason}</p>}
                </div>
              ))}
              {!historyQuery.isLoading && (historyQuery.data ?? []).length === 0 && (
                <p className="text-sm text-slate-500">No stage history recorded yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
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

  const {
    data: patients = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['patients', search, statusFilter],
    queryFn: () => fetchPatients({
      q: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
  });

  const startMutation = useMutation({
    mutationFn: (enrollmentId: string) => startEnrollment(enrollmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDir(key === 'name' ? 'asc' : 'desc');
  }

  const filtered = useMemo(() => {
    const list = [...patients];
    list.sort((a, b) => {
      let comparison = 0;

      if (sortKey === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortKey === 'riskLevel') {
        comparison = RISK_ORDER[a.riskLevel as RiskLevel] - RISK_ORDER[b.riskLevel as RiskLevel];
      } else if (sortKey === 'openTasks') comparison = a.openTasks - b.openTasks;
      else if (sortKey === 'lastActivityAt') {
        const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        comparison = aTime - bTime;
      }

      return sortDir === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [patients, sortDir, sortKey]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: patients.length };
    patients.forEach((patient) => {
      counts[patient.status] = (counts[patient.status] ?? 0) + 1;
    });
    return counts;
  }, [patients]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-blue-500" />
      : <ChevronDown className="h-3 w-3 text-blue-500" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search enrolled patients by name, MRN, or pathway…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {status} <span className="text-slate-400">({statusCounts[status] ?? 0})</span>
          </button>
        ))}
      </div>

      {isError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            {(error as any)?.response?.data?.message ?? 'Unable to load enrolled patients.'}
          </p>
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[
                  { label: 'Patient', key: 'name' },
                  { label: 'Status', key: null },
                  { label: 'Risk', key: 'riskLevel' },
                  { label: 'Patient Pathways', key: null },
                  { label: 'Coordinator', key: null },
                  { label: 'Open Tasks', key: 'openTasks' },
                  { label: 'Last Activity', key: 'lastActivityAt' },
                  { label: '', key: null },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${key ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}
                    onClick={() => key && toggleSort(key as SortKey)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {key && <SortIcon col={key as SortKey} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-4">
                        <div className="h-4 bg-slate-100 rounded w-full max-w-[180px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                filtered.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={patient.name} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900">{patient.name}</p>
                          <p className="text-xs text-slate-400">{patient.mrn || patient.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={patient.status} /></td>
                    <td className="px-4 py-3.5"><RiskBadge level={patient.riskLevel} /></td>
                    <td className="px-4 py-3.5 max-w-[260px]">
                      <div className="space-y-2">
                        {patient.enrollments?.length ? patient.enrollments.map((enrollment) => (
                          <div key={enrollment.enrollmentId} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-800">{enrollment.pathwayName}</p>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                  {enrollmentStatusLabel(enrollment.status)}
                                  {enrollment.status === 'active' ? ` · ${enrollment.currentStage.name}` : ''}
                                </p>
                              </div>
                              <StatusBadge status={enrollment.status.toUpperCase()} />
                            </div>
                          </div>
                        )) : (
                          <>
                            <p className="text-slate-700 truncate">{pathwaySummary(patient)}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {patient.enrolledPathways} enrollment{patient.enrolledPathways === 1 ? '' : 's'}
                            </p>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {patient.assignedCareCoordinator ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={patient.assignedCareCoordinator} size="xs" />
                          <span className="text-slate-600 text-xs whitespace-nowrap">
                            {patient.assignedCareCoordinator}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${patient.overdueTasks > 0 ? 'text-red-600' : patient.openTasks > 1 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {patient.openTasks}
                        </span>
                        {patient.overdueTasks > 0 && (
                          <span className="text-xs text-red-500">
                            {patient.overdueTasks} overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                      {formatDateLabel(patient.lastActivityAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-2">
                        {(patient.enrollments ?? []).map((enrollment) => (
                          <div key={enrollment.enrollmentId} className="flex items-center gap-2">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setSelectedProgress({ patient, enrollment })}
                            >
                              View
                            </Button>
                            {enrollment.canStart && (
                              <Button
                                size="xs"
                                onClick={() => startMutation.mutate(enrollment.enrollmentId)}
                                loading={startMutation.isPending}
                                icon={<PlayCircle className="h-3.5 w-3.5" />}
                              >
                                Start
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-500">No enrolled patients match your search.</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
          <span>Showing {filtered.length} enrolled patients</span>
          <Button variant="outline" size="xs" disabled>
            Patient 360 wiring pending
          </Button>
        </div>
      </Card>
      {selectedProgress && (
        <ProgressDrawer
          patient={selectedProgress.patient}
          enrollment={selectedProgress.enrollment}
          onClose={() => setSelectedProgress(null)}
        />
      )}
    </div>
  );
}
