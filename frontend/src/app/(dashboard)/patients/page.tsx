'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertCircle, ArrowRight, ChevronDown, ChevronUp,
  Search, X, MoreHorizontal, UserPlus
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { RiskBadge, StatusBadge, Badge } from '@/components/ui/Badge';
import { fetchPatients, type ApiPatientListItem } from '@/services/patients.service';
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

function PathwaySelectionModal({
  patient,
  onClose,
}: {
  patient: ApiPatientListItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-border bg-muted/20 px-6 py-5">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary">Select Patient Pathway</p>
            <h2 className="font-display text-lg font-black text-foreground">{patient.name}</h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              This patient has {patient.enrollments.length} pathways. Select one to monitor.
            </p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-3">
            {patient.enrollments.map((enrollment) => (
              <Link
                key={enrollment.enrollmentId}
                href={`/patients/${patient.id}?enrollmentId=${enrollment.enrollmentId}`}
                className="block rounded-2xl border border-border/70 bg-background p-4 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-black text-foreground">{enrollment.pathwayName}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={enrollment.status.toUpperCase()} />
                      <Badge variant="neutral" size="xs">{enrollment.currentStage.name}</Badge>
                      <Badge variant="neutral" size="xs">{enrollment.currentStage.code}</Badge>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                  <span>{enrollment.openTasks} open tasks</span>
                  <span>{enrollment.overdueTasks} overdue</span>
                  <span>{formatDateLabel(enrollment.lastActivityAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function PatientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('lastActivityAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pathwayPickerPatient, setPathwayPickerPatient] = useState<ApiPatientListItem | null>(null);

  const { data: patients = [], isLoading, isError, error } = useQuery({
    queryKey: ['patients', search, statusFilter],
    queryFn: () => fetchPatients({ q: search.trim() || undefined, status: statusFilter === 'ALL' ? undefined : statusFilter }),
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

  function handleMonitor(patient: ApiPatientListItem) {
    if (patient.enrollments.length === 1) {
      router.push(`/patients/${patient.id}?enrollmentId=${patient.enrollments[0].enrollmentId}`);
      return;
    }

    if (patient.enrollments.length > 1) {
      setPathwayPickerPatient(patient);
    }
  }

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
                        <Button size="xs" variant="outline" onClick={() => handleMonitor(p)}>
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
        {pathwayPickerPatient && (
          <PathwaySelectionModal
            patient={pathwayPickerPatient}
            onClose={() => setPathwayPickerPatient(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
