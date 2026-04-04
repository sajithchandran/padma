'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone, Mail, Calendar, MapPin, Activity, CheckSquare, Route, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, RiskBadge, StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { MOCK_PATIENTS, MOCK_TASKS, MOCK_PATHWAYS } from '@/lib/mock-data';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const patient = MOCK_PATIENTS.find((p) => p.id === id) ?? MOCK_PATIENTS[0];
  const tasks = MOCK_TASKS.filter((t) => t.patientId === patient.id);
  const pathways = MOCK_PATHWAYS.filter((pw) => pw.patientId === patient.id);

  const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();

  return (
    <div className="space-y-6">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/patients" className="hover:text-slate-700 transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Patients
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{patient.name}</span>
      </div>

      {/* Hero card */}
      <Card padding="none" className="overflow-hidden">
        {/* Top color bar by risk */}
        <div className={`h-1.5 w-full ${patient.riskLevel === 'CRITICAL' ? 'bg-red-500' : patient.riskLevel === 'HIGH' ? 'bg-orange-400' : patient.riskLevel === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
        <div className="p-6 flex flex-col sm:flex-row gap-6">
          <Avatar name={patient.name} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
                <p className="text-sm text-slate-500">{patient.mrn} · {age} yrs · {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <RiskBadge level={patient.riskLevel} />
                <StatusBadge status={patient.status} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoItem icon={<Activity className="h-4 w-4" />} label="Primary Diagnosis" value={patient.primaryDiagnosis} />
              <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={patient.phoneNumber} />
              <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={patient.email ?? '—'} />
              <InfoItem icon={<Calendar className="h-4 w-4" />} label="Next Appointment" value={patient.nextAppointment ?? 'Not scheduled'} />
            </div>
          </div>

          <div className="flex sm:flex-col gap-2 flex-shrink-0">
            <Button size="sm" icon={<Phone className="h-4 w-4" />}>Call Patient</Button>
            <Button size="sm" variant="outline" icon={<CheckSquare className="h-4 w-4" />}>Add Task</Button>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled Pathways', value: patient.enrolledPathways, color: 'text-blue-600' },
          { label: 'Open Tasks', value: patient.openTasks, color: patient.openTasks > 4 ? 'text-red-600' : 'text-amber-600' },
          { label: 'Last Visit', value: patient.lastVisit ?? '—', color: 'text-slate-700' },
          { label: 'Days Since Visit', value: patient.lastVisit ? Math.floor((new Date().getTime() - new Date(patient.lastVisit).getTime()) / 86400000) : '—', color: 'text-slate-700' },
        ].map((s) => (
          <Card key={s.label} padding="sm">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Pathways + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Pathways */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-slate-100">
            <CardTitle>Care Pathways</CardTitle>
            <CardSubtitle>{pathways.length} enrolled pathway{pathways.length !== 1 ? 's' : ''}</CardSubtitle>
          </div>
          {pathways.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No pathways enrolled</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {pathways.map((pw) => (
                <div key={pw.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{pw.name}</p>
                      <p className="text-xs text-slate-500">{pw.code} · Started {pw.startDate}</p>
                    </div>
                    <StatusBadge status={pw.status} />
                  </div>
                  <Progress value={pw.progressPct} size="sm" showLabel label={`${pw.completedSteps} of ${pw.totalSteps} steps`} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Tasks */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-slate-100">
            <CardTitle>Tasks</CardTitle>
            <CardSubtitle>{tasks.filter((t) => t.status !== 'COMPLETED').length} open tasks</CardSubtitle>
          </div>
          {tasks.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No tasks</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tasks.map((t) => (
                <div key={t.id} className="px-5 py-3.5 flex items-start gap-3">
                  <StatusBadge status={t.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Due {t.dueDate} · {t.assignedTo}</p>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
        {icon} {label}
      </div>
      <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
    </div>
  );
}
