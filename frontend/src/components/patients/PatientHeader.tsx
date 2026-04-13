'use client';

import { Activity, Calendar, Clock, Route, UserRound } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, RiskBadge, StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { ApiPatientListItem } from '@/services/patients.service';
import { cn } from '@/lib/utils';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function getAge(value?: string | null) {
  if (!value) return null;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function PatientHeader({
  patient,
  activeEnrollment,
  className,
}: {
  patient: ApiPatientListItem;
  activeEnrollment?: ApiPatientListItem['enrollments'][number] | null;
  className?: string;
}) {
  const age = getAge(patient.dob);
  const gender = patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender || '—';

  return (
    <Card padding="none" className={cn('overflow-hidden border-border/70', className)}>
      <div className={cn(
        'h-1.5 w-full',
        patient.riskLevel === 'CRITICAL' ? 'bg-red-500'
          : patient.riskLevel === 'HIGH' ? 'bg-orange-400'
            : patient.riskLevel === 'MEDIUM' ? 'bg-amber-400'
              : 'bg-emerald-400',
      )} />
      <div className="p-5 lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Avatar name={patient.name} size="xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl font-black text-foreground">{patient.name}</h1>
                <RiskBadge level={patient.riskLevel} />
                <StatusBadge status={patient.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-tight text-muted-foreground">
                <span>{patient.mrn ? `MRN ${patient.mrn}` : patient.id}</span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>{age != null ? `${age} yrs` : formatDate(patient.dob)}</span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>{gender}</span>
              </div>
              {activeEnrollment && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="info" size="sm">{activeEnrollment.pathwayName}</Badge>
                  <Badge variant="neutral" size="sm">{activeEnrollment.currentStage.name}</Badge>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            <HeaderMetric icon={<Route className="h-4 w-4" />} label="Pathways" value={patient.enrolledPathways} />
            <HeaderMetric icon={<Activity className="h-4 w-4" />} label="Open Tasks" value={patient.openTasks} tone={patient.openTasks > 0 ? 'warn' : 'ok'} />
            <HeaderMetric icon={<Clock className="h-4 w-4" />} label="Overdue" value={patient.overdueTasks} tone={patient.overdueTasks > 0 ? 'danger' : 'ok'} />
            <HeaderMetric icon={<Calendar className="h-4 w-4" />} label="Activity" value={formatDateTime(patient.lastActivityAt)} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem icon={<UserRound className="h-4 w-4" />} label="Care Coordinator" value={patient.assignedCareCoordinator ?? 'Unassigned'} />
          <InfoItem icon={<Route className="h-4 w-4" />} label="Current Pathways" value={patient.currentPathwaySummary || 'No active pathways'} />
          <InfoItem icon={<Calendar className="h-4 w-4" />} label="DOB" value={formatDate(patient.dob)} />
        </div>
      </div>
    </Card>
  );
}

function HeaderMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  return (
    <div className={cn(
      'rounded-2xl border border-border/60 bg-muted/20 p-3',
      tone === 'ok' && 'bg-emerald-500/5',
      tone === 'warn' && 'bg-amber-500/5',
      tone === 'danger' && 'bg-red-500/5',
    )}>
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-[10px] font-black uppercase tracking-widest">{label}</span></div>
      <p className="truncate text-base font-black text-foreground">{value}</p>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/20 px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
