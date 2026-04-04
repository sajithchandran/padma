// ─── Domain Types ────────────────────────────────────────────────────────────

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  country: string;
  timezone: string;
  featureFlags: Record<string, boolean>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  roleCode: string;
  permissions: string[];
  avatarUrl?: string;
  facilityId?: string;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ─── Clinical Types ───────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PatientStatus = 'ACTIVE' | 'INACTIVE' | 'DISCHARGED';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
export type PathwayStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
export type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN';

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  dob: string;
  gender: 'M' | 'F' | 'OTHER';
  riskLevel: RiskLevel;
  status: PatientStatus;
  primaryDiagnosis: string;
  assignedCareCoordinator?: string;
  phoneNumber: string;
  email?: string;
  lastVisit?: string;
  nextAppointment?: string;
  enrolledPathways: number;
  openTasks: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  dueDate: string;
  assignedTo?: string;
  patientId?: string;
  patientName?: string;
  pathwayId?: string;
  pathwayName?: string;
  category: string;
  createdAt: string;
}

export interface ClinicalPathway {
  id: string;
  name: string;
  code: string;
  description: string;
  status: PathwayStatus;
  totalSteps: number;
  completedSteps: number;
  patientId?: string;
  patientName?: string;
  startDate: string;
  targetEndDate?: string;
  diagnosis: string;
  progressPct: number;
}

export interface Enrollment {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  pathwayId: string;
  pathwayName: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  enrolledBy: string;
  completedAt?: string;
  riskLevel: RiskLevel;
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalPatients: number;
  activePathways: number;
  tasksDueToday: number;
  enrollmentRate: number;
  patientsChange: number;
  pathwaysChange: number;
  tasksChange: number;
  enrollmentChange: number;
}
