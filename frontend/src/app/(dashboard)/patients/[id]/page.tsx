'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Calendar, CheckCircle2, Loader2, Route } from 'lucide-react';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { PatientHeader } from '@/components/patients/PatientHeader';
import { PatientPathwayMonitorContent } from '@/components/patients/PatientPathwayMonitor';
import { fetchPatient } from '@/services/patients.service';
import { cn } from '@/lib/utils';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedEnrollmentId = searchParams.get('enrollmentId');

  const patientQuery = useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatient(id),
  });

  const patient = patientQuery.data;
  const selectedEnrollment = useMemo(() => {
    if (!patient?.enrollments.length) return null;
    return patient.enrollments.find((item) => item.enrollmentId === selectedEnrollmentId)
      ?? patient.enrollments[0];
  }, [patient, selectedEnrollmentId]);

  useEffect(() => {
    if (!patient?.enrollments.length || selectedEnrollmentId) return;
    router.replace(`/patients/${id}?enrollmentId=${patient.enrollments[0].enrollmentId}`, { scroll: false });
  }, [id, patient?.enrollments, router, selectedEnrollmentId]);

  if (patientQuery.isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (patientQuery.isError || !patient) {
    return (
      <Card padding="lg" className="text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
        <h2 className="font-display text-lg font-black text-foreground">Unable to load patient</h2>
        <p className="mt-1 text-sm text-muted-foreground">{(patientQuery.error as Error)?.message ?? 'Patient data is unavailable.'}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/patients">Back to Patients</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <Link href="/patients" className="flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Patients
      </Link>

      <PatientHeader patient={patient} activeEnrollment={selectedEnrollment} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Enrolled Pathways" value={patient.enrolledPathways} />
        <SummaryCard label="Open Tasks" value={patient.openTasks} tone={patient.openTasks > 0 ? 'warn' : 'ok'} />
        <SummaryCard label="Overdue Tasks" value={patient.overdueTasks} tone={patient.overdueTasks > 0 ? 'danger' : 'ok'} />
        <SummaryCard label="Last Activity" value={formatDateTime(patient.lastActivityAt)} />
      </div>

      <Card padding="none" className="overflow-hidden border-border/60">
        <div className="border-b border-border/60 bg-muted/20 px-5 py-4">
          <h2 className="font-display text-base font-black text-foreground">Patient Pathways</h2>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {patient.enrollments.length > 1
              ? 'Select a pathway below. Details, tasks, chat, and transitions stay on this same page.'
              : 'The patient pathway details are shown below on this page.'}
          </p>
        </div>

        {patient.enrollments.length === 0 ? (
          <div className="p-10 text-center">
            <Route className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">This patient has no pathway enrollments.</p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {patient.enrollments.map((enrollment) => {
              const completion = enrollment.totalTasks > 0
                ? Math.round((enrollment.completedTasks / enrollment.totalTasks) * 100)
                : 0;
              const isSelected = selectedEnrollment?.enrollmentId === enrollment.enrollmentId;

              return (
                <button
                  key={enrollment.enrollmentId}
                  type="button"
                  onClick={() => router.replace(`/patients/${patient.id}?enrollmentId=${enrollment.enrollmentId}`, { scroll: false })}
                  className={cn(
                    'rounded-2xl border bg-card p-4 text-left shadow-sm transition',
                    isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-border/70 hover:border-primary/40 hover:bg-primary/5',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-sm font-black text-foreground">{enrollment.pathwayName}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={enrollment.status.toUpperCase()} />
                        <Badge variant="neutral" size="xs">{enrollment.currentStage.name}</Badge>
                        <Badge variant="neutral" size="xs">{enrollment.currentStage.stageType}</Badge>
                      </div>
                    </div>
                    <Badge variant={isSelected ? 'info' : 'neutral'} size="xs">
                      {isSelected ? 'Selected' : 'Select'}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <Progress value={completion} label="Task Completion" showLabel />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <PathwayMetric icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Done" value={`${enrollment.completedTasks}/${enrollment.totalTasks}`} />
                    <PathwayMetric icon={<AlertCircle className="h-3.5 w-3.5" />} label="Open" value={enrollment.openTasks} />
                    <PathwayMetric icon={<Calendar className="h-3.5 w-3.5" />} label="Activity" value={formatDateTime(enrollment.lastActivityAt)} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selectedEnrollment && (
        <PatientPathwayMonitorContent patient={patient} enrollment={selectedEnrollment} />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  const toneClass = tone === 'danger' ? 'text-red-500' : tone === 'warn' ? 'text-amber-500' : tone === 'ok' ? 'text-emerald-500' : 'text-foreground';
  return (
    <Card padding="sm" className="border-border/60">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-xl font-black ${toneClass}`}>{value}</p>
    </Card>
  );
}

function PathwayMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-muted/20 p-2">
      <div className="mb-1 flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="truncate text-xs font-black text-foreground">{value}</p>
    </div>
  );
}
