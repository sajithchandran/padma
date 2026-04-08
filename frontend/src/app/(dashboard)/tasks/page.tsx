'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Clock, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import type { TaskStatus } from '@/types';
import { fetchTasks, type ApiTask } from '@/services/tasks.service';

const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'PENDING',     label: 'Pending',     color: 'border-amber-400' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-500' },
  { status: 'OVERDUE',     label: 'Overdue',     color: 'border-red-500' },
  { status: 'COMPLETED',   label: 'Completed',   color: 'border-emerald-500' },
];

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

type ViewTask = {
  id: string;
  title: string;
  patientName?: string;
  pathwayName?: string;
  assignedTo?: string;
  dueDate: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: TaskStatus;
};

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
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function TasksPage() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const filter = searchParams.get('filter');
  const currentUserId = typeof window !== 'undefined'
    ? sessionStorage.getItem('padma_user_id')
    : null;

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['tasks', filter, currentUserId],
    queryFn: () => fetchTasks({
      assignedToUserId: filter === 'mine' ? currentUserId ?? undefined : undefined,
      limit: 100,
    }),
  });

  const tasks = useMemo<ViewTask[]>(() => (response?.data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    patientName: task.patientDisplayName ?? undefined,
    pathwayName: task.interventionTemplate?.name ?? undefined,
    assignedTo: task.assignedToUserId === currentUserId ? 'Me' : (task.assignedToRole || task.assignedToUserId || undefined),
    dueDate: formatDueDate(task.dueDate),
    priority: mapPriority(task.priority, task.isCritical),
    status: mapStatus(task),
  })), [response?.data, currentUserId]);

  const filtered = useMemo(() =>
    tasks.filter((t) => {
      const q = search.toLowerCase();
      return !q || t.title.toLowerCase().includes(q) || t.patientName?.toLowerCase().includes(q);
    }), [tasks, search]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
            {(['kanban', 'list'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {v}
              </button>
            ))}
          </div>
          <Button icon={<Plus className="h-4 w-4" />}>Add Task</Button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {STATUS_COLUMNS.map((col) => {
          const count = tasks.filter((t) => t.status === col.status).length;
          return (
            <div key={col.status} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-l-4 border border-slate-200 ${col.color}`}>
              <span className="text-xs font-medium text-slate-600">{col.label}</span>
              <span className="text-sm font-bold text-slate-900">{count}</span>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <Card className="p-8">
          <p className="text-sm text-slate-500">Loading tasks from the backend…</p>
        </Card>
      ) : isError ? (
        <Card className="p-8">
          <p className="text-sm font-medium text-red-700">Unable to load tasks.</p>
          <p className="mt-1 text-sm text-slate-500">
            {error instanceof Error ? error.message : 'The tasks API request failed.'}
          </p>
        </Card>
      ) : view === 'kanban' ? (
        // Kanban Board
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = filtered
              .filter((t) => t.status === col.status)
              .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
            return (
              <div key={col.status} className="flex flex-col gap-3">
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg bg-white border-l-4 border border-slate-200 ${col.color}`}>
                  <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                  <span className="h-5 min-w-5 px-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600 flex items-center justify-center">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2.5 min-h-[120px]">
                  {colTasks.map((task) => (
                    <div key={task.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <PriorityBadge priority={task.priority} />
                        {task.priority === 'URGENT' && (
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">{task.title}</p>
                      {task.patientName && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{task.patientName}</p>
                      )}
                      {task.pathwayName && (
                        <p className="text-xs text-slate-400 truncate">{task.pathwayName}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {task.dueDate}
                        </div>
                        {task.assignedTo && <Avatar name={task.assignedTo} size="xs" />}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-slate-200">
                      <p className="text-xs text-slate-400">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // List view
        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Task', 'Patient', 'Pathway', 'Priority', 'Status', 'Due', 'Assigned To'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-900 max-w-[200px]">
                    <p className="truncate">{task.title}</p>
                    {task.priority === 'URGENT' && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-500">Urgent</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{task.patientName ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500 max-w-[150px]">
                    <p className="truncate">{task.pathwayName ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3.5"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-4 py-3.5"><StatusBadge status={task.status} /></td>
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{task.dueDate}</td>
                  <td className="px-4 py-3.5">
                    {task.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={task.assignedTo} size="xs" />
                        <span className="text-xs text-slate-600 whitespace-nowrap">{task.assignedTo}</span>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">No tasks found.</div>
          )}
        </Card>
      )}
    </div>
  );
}
