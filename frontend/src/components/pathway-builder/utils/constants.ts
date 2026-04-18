import type { StageType, TriggerType } from '@/types/pathway-builder.types';

// ─── Stage type styling ─────────────────────────────────────────────────────

export const STAGE_TYPE_CONFIG: Record<
  StageType,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  entry: {
    label: 'Entry',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  intermediate: {
    label: 'Intermediate',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-l-purple-500',
    dot: 'bg-purple-500',
  },
  decision: {
    label: 'Decision',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
    dot: 'bg-amber-500',
  },
  terminal: {
    label: 'Terminal',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
  },
};

// ─── Trigger type styling ───────────────────────────────────────────────────

export const TRIGGER_TYPE_CONFIG: Record<
  TriggerType,
  { label: string; color: string; stroke: string }
> = {
  outcome_based: {
    label: 'Outcome',
    color: 'text-blue-600',
    stroke: '#2563eb',
  },
  time_based: {
    label: 'Time',
    color: 'text-green-600',
    stroke: '#16a34a',
  },
  manual: {
    label: 'Manual',
    color: 'text-slate-600',
    stroke: '#475569',
  },
  event_based: {
    label: 'Event',
    color: 'text-purple-600',
    stroke: '#9333ea',
  },
};

// ─── Intervention enums ─────────────────────────────────────────────────────

export const INTERVENTION_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'lab_test', label: 'Lab Test' },
  { value: 'medication', label: 'Medication' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'education', label: 'Patient Education' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'vital_signs', label: 'Vital Signs' },
  { value: 'device_reading', label: 'Device Reading' },
  { value: 'telehealth', label: 'Telehealth' },
  { value: 'home_visit', label: 'Home Visit' },
  { value: 'bedside_monitoring', label: 'Bedside Monitoring' },
  { value: 'discharge_planning', label: 'Discharge Planning' },
] as const;

export const DELIVERY_MODES = [
  { value: 'in_person', label: 'In Person' },
  { value: 'telehealth', label: 'Telehealth' },
  { value: 'remote_monitoring', label: 'Remote Monitoring' },
  { value: 'self_report', label: 'Self Report' },
  { value: 'app_based', label: 'App Based' },
] as const;

export const FREQUENCY_TYPES = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'custom_days', label: 'Custom Days' },
] as const;

export const CARE_SETTINGS = [
  { value: 'outpatient', label: 'Outpatient' },
  { value: 'inpatient', label: 'Inpatient' },
  { value: 'home_care', label: 'Home Care' },
  { value: 'any', label: 'Any' },
] as const;

export const OWNER_ROLES = [
  { value: 'physician', label: 'Physician' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'care_coordinator', label: 'Care Coordinator' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'therapist', label: 'Therapist' },
  { value: 'social_worker', label: 'Social Worker' },
] as const;

// ─── Canvas config ──────────────────────────────────────────────────────────

export const CANVAS_CONFIG = {
  snapGrid: [20, 20] as [number, number],
  minZoom: 0.2,
  maxZoom: 2,
  defaultViewport: { x: 50, y: 50, zoom: 0.85 },
  nodeWidth: 260,
  nodeHeight: 120,
};
