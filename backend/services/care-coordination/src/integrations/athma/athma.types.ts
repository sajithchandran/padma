// ============================================================
// Athma inbound webhook payload types
// ============================================================

export interface AthmaWebhookEvent {
  /** e.g. 'appointment.completed', 'lab_result.available' */
  event_type: string;
  tenant_id: string;
  patient_id: string;
  /** e.g. 'appointment', 'lab_result' */
  entity_type: string;
  entity_id: string;
  /** ISO 8601 timestamp */
  occurred_at: string;
  payload: Record<string, unknown>;
}

export interface AthmaAppointmentPayload {
  appointment_type: string;
  specialty?: string;
  doctor_id?: string;
  facility_id?: string;
}

export interface AthmaLabResultPayload {
  /** e.g. HBA1C, FBS, BP_SYS */
  test_code: string;
  value: number;
  unit: string;
  /** ISO 8601 timestamp */
  result_at: string;
}

export interface AthmaInpatientPayload {
  assessment_type?: string;
  ward_id?: string;
  nurse_id?: string;
}

// ============================================================
// Athma outbound API types
// ============================================================

export interface AthmaProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  isActive: boolean;
}

export interface AthmaPatient {
  id: string;
  displayName: string;
  mrn: string;
  dob: string;
  gender: string;
  tenantId: string;
}

export interface AthmaTriggerPayload {
  tenantId: string;
  patientId: string;
  triggerType: string;
  channel?: string;
  scheduledAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AthmaOpdStatus {
  patientId: string;
  status: string;
  lastVisitAt?: string;
  nextAppointmentAt?: string;
  currentPhase?: string;
}
