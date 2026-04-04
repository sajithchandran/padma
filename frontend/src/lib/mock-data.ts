import type {
  Patient, Task, ClinicalPathway, Enrollment, DashboardStats, User, Tenant,
} from '@/types';

// ─── Auth Mock ────────────────────────────────────────────────────────────────

export const MOCK_USER: User = {
  id: '7286505d-6cd5-4cd7-93af-eae66daf12b1',
  email: 'admin@padma.dev',
  name: 'Sarah Mitchell',
  role: 'System Administrator',
  roleCode: 'admin',
  permissions: ['pathway:create', 'task:complete', 'patient:view_pii', 'manage_tenant'],
  avatarUrl: undefined,
};

export const MOCK_TENANT: Tenant = {
  id: '634f313f-9120-4223-8966-e4e3121a1f69',
  slug: 'demo-healthcare',
  name: 'Demo Healthcare System',
  status: 'ACTIVE',
  country: 'AE',
  timezone: 'Asia/Dubai',
  featureFlags: { realtime: true, advancedAnalytics: true },
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const MOCK_STATS: DashboardStats = {
  totalPatients: 1247,
  activePathways: 384,
  tasksDueToday: 23,
  enrollmentRate: 78,
  patientsChange: 4.2,
  pathwaysChange: 12.1,
  tasksChange: -8.3,
  enrollmentChange: 2.7,
};

// ─── Patients ────────────────────────────────────────────────────────────────

export const MOCK_PATIENTS: Patient[] = [
  { id: 'p1', mrn: 'MRN-00421', name: 'Ahmed Al-Rashidi', dob: '1962-04-15', gender: 'M', riskLevel: 'HIGH', status: 'ACTIVE', primaryDiagnosis: 'Type 2 Diabetes + CHF', assignedCareCoordinator: 'Sarah Mitchell', phoneNumber: '+971-50-123-4567', email: 'a.rashidi@example.com', lastVisit: '2026-03-28', nextAppointment: '2026-04-10', enrolledPathways: 3, openTasks: 5 },
  { id: 'p2', mrn: 'MRN-00422', name: 'Fatima Al-Zaabi', dob: '1975-09-22', gender: 'F', riskLevel: 'MEDIUM', status: 'ACTIVE', primaryDiagnosis: 'COPD', assignedCareCoordinator: 'James Cooper', phoneNumber: '+971-55-234-5678', lastVisit: '2026-03-30', nextAppointment: '2026-04-15', enrolledPathways: 2, openTasks: 2 },
  { id: 'p3', mrn: 'MRN-00423', name: 'Maria Santos', dob: '1980-12-05', gender: 'F', riskLevel: 'LOW', status: 'ACTIVE', primaryDiagnosis: 'Hypertension', assignedCareCoordinator: 'Sarah Mitchell', phoneNumber: '+971-52-345-6789', lastVisit: '2026-04-01', nextAppointment: '2026-04-20', enrolledPathways: 1, openTasks: 1 },
  { id: 'p4', mrn: 'MRN-00424', name: 'Khalid Al-Mansoori', dob: '1955-03-18', gender: 'M', riskLevel: 'CRITICAL', status: 'ACTIVE', primaryDiagnosis: 'CKD Stage 4 + Diabetes', assignedCareCoordinator: 'Priya Sharma', phoneNumber: '+971-50-456-7890', lastVisit: '2026-04-02', nextAppointment: '2026-04-07', enrolledPathways: 4, openTasks: 8 },
  { id: 'p5', mrn: 'MRN-00425', name: 'Lindiwe Dlamini', dob: '1990-06-30', gender: 'F', riskLevel: 'LOW', status: 'ACTIVE', primaryDiagnosis: 'Gestational Diabetes', assignedCareCoordinator: 'James Cooper', phoneNumber: '+971-56-567-8901', lastVisit: '2026-03-25', nextAppointment: '2026-04-12', enrolledPathways: 1, openTasks: 0 },
  { id: 'p6', mrn: 'MRN-00426', name: 'Robert Chen', dob: '1968-11-14', gender: 'M', riskLevel: 'HIGH', status: 'ACTIVE', primaryDiagnosis: 'Post-MI Rehabilitation', assignedCareCoordinator: 'Priya Sharma', phoneNumber: '+971-54-678-9012', lastVisit: '2026-03-29', nextAppointment: '2026-04-08', enrolledPathways: 2, openTasks: 3 },
  { id: 'p7', mrn: 'MRN-00427', name: 'Aisha Mohammed', dob: '1945-08-03', gender: 'F', riskLevel: 'CRITICAL', status: 'ACTIVE', primaryDiagnosis: 'CHF + Atrial Fibrillation', assignedCareCoordinator: 'Sarah Mitchell', phoneNumber: '+971-50-789-0123', lastVisit: '2026-04-03', nextAppointment: '2026-04-05', enrolledPathways: 3, openTasks: 6 },
  { id: 'p8', mrn: 'MRN-00428', name: 'Carlos Mendez', dob: '1972-02-27', gender: 'M', riskLevel: 'MEDIUM', status: 'ACTIVE', primaryDiagnosis: 'Type 1 Diabetes', assignedCareCoordinator: 'James Cooper', phoneNumber: '+971-55-890-1234', lastVisit: '2026-03-31', nextAppointment: '2026-04-18', enrolledPathways: 2, openTasks: 2 },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Review HbA1c results', description: 'Review latest lab results and adjust insulin dosage', status: 'PENDING', priority: 'URGENT', dueDate: '2026-04-04', assignedTo: 'Sarah Mitchell', patientId: 'p1', patientName: 'Ahmed Al-Rashidi', pathwayName: 'Diabetes Management', category: 'Lab Review', createdAt: '2026-04-01' },
  { id: 't2', title: 'Follow-up call — COPD symptom check', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-04-04', assignedTo: 'James Cooper', patientId: 'p2', patientName: 'Fatima Al-Zaabi', pathwayName: 'COPD Management', category: 'Outreach', createdAt: '2026-04-02' },
  { id: 't3', title: 'Medication reconciliation', status: 'COMPLETED', priority: 'NORMAL', dueDate: '2026-04-03', assignedTo: 'Priya Sharma', patientId: 'p4', patientName: 'Khalid Al-Mansoori', pathwayName: 'CKD Care Pathway', category: 'Medication', createdAt: '2026-03-31' },
  { id: 't4', title: 'Schedule nephrology referral', status: 'OVERDUE', priority: 'HIGH', dueDate: '2026-04-01', assignedTo: 'Priya Sharma', patientId: 'p4', patientName: 'Khalid Al-Mansoori', pathwayName: 'CKD Care Pathway', category: 'Referral', createdAt: '2026-03-28' },
  { id: 't5', title: 'Cardiac rehab enrollment confirmation', status: 'PENDING', priority: 'NORMAL', dueDate: '2026-04-06', assignedTo: 'Priya Sharma', patientId: 'p6', patientName: 'Robert Chen', pathwayName: 'Post-MI Rehabilitation', category: 'Enrollment', createdAt: '2026-04-02' },
  { id: 't6', title: 'Blood pressure log review', status: 'PENDING', priority: 'NORMAL', dueDate: '2026-04-05', assignedTo: 'Sarah Mitchell', patientId: 'p3', patientName: 'Maria Santos', pathwayName: 'Hypertension Management', category: 'Lab Review', createdAt: '2026-04-03' },
  { id: 't7', title: 'CHF weight monitoring alert', status: 'IN_PROGRESS', priority: 'URGENT', dueDate: '2026-04-04', assignedTo: 'Sarah Mitchell', patientId: 'p7', patientName: 'Aisha Mohammed', pathwayName: 'CHF Management', category: 'Alert', createdAt: '2026-04-04' },
  { id: 't8', title: 'Glycaemic control education session', status: 'PENDING', priority: 'LOW', dueDate: '2026-04-09', assignedTo: 'James Cooper', patientId: 'p8', patientName: 'Carlos Mendez', pathwayName: 'Diabetes Management', category: 'Education', createdAt: '2026-04-03' },
];

// ─── Pathways ─────────────────────────────────────────────────────────────────

export const MOCK_PATHWAYS: ClinicalPathway[] = [
  { id: 'pw1', name: 'Diabetes Management', code: 'DM-001', description: '12-week evidence-based diabetes care and lifestyle management pathway', status: 'ACTIVE', totalSteps: 12, completedSteps: 8, patientId: 'p1', patientName: 'Ahmed Al-Rashidi', startDate: '2026-01-15', targetEndDate: '2026-04-15', diagnosis: 'Type 2 Diabetes', progressPct: 67 },
  { id: 'pw2', name: 'COPD Management', code: 'COPD-001', description: 'Chronic obstructive pulmonary disease monitoring and rehabilitation', status: 'ACTIVE', totalSteps: 10, completedSteps: 4, patientId: 'p2', patientName: 'Fatima Al-Zaabi', startDate: '2026-02-01', targetEndDate: '2026-05-01', diagnosis: 'COPD', progressPct: 40 },
  { id: 'pw3', name: 'CKD Care Pathway', code: 'CKD-001', description: 'Chronic kidney disease stage 4 multidisciplinary management', status: 'ACTIVE', totalSteps: 16, completedSteps: 6, patientId: 'p4', patientName: 'Khalid Al-Mansoori', startDate: '2026-01-20', targetEndDate: '2026-07-20', diagnosis: 'CKD Stage 4', progressPct: 38 },
  { id: 'pw4', name: 'Post-MI Rehabilitation', code: 'CARDIAC-001', description: '6-month cardiac rehabilitation and secondary prevention pathway', status: 'ACTIVE', totalSteps: 20, completedSteps: 9, patientId: 'p6', patientName: 'Robert Chen', startDate: '2026-02-15', targetEndDate: '2026-08-15', diagnosis: 'Post-Myocardial Infarction', progressPct: 45 },
  { id: 'pw5', name: 'CHF Management', code: 'CHF-001', description: 'Congestive heart failure monitoring, medication titration and education', status: 'ACTIVE', totalSteps: 14, completedSteps: 11, patientId: 'p7', patientName: 'Aisha Mohammed', startDate: '2025-12-01', targetEndDate: '2026-04-30', diagnosis: 'CHF + AF', progressPct: 79 },
  { id: 'pw6', name: 'Hypertension Management', code: 'HTN-001', description: 'Blood pressure control, lifestyle modification and medication compliance', status: 'ACTIVE', totalSteps: 8, completedSteps: 3, patientId: 'p3', patientName: 'Maria Santos', startDate: '2026-03-01', targetEndDate: '2026-06-01', diagnosis: 'Hypertension', progressPct: 38 },
  { id: 'pw7', name: 'Gestational Diabetes', code: 'GDM-001', description: 'Gestational diabetes monitoring and management through term', status: 'COMPLETED', totalSteps: 8, completedSteps: 8, patientId: 'p5', patientName: 'Lindiwe Dlamini', startDate: '2026-01-10', targetEndDate: '2026-04-01', diagnosis: 'Gestational Diabetes', progressPct: 100 },
  { id: 'pw8', name: 'Type 1 Diabetes Self-Management', code: 'T1DM-001', description: 'Advanced insulin therapy and continuous glucose monitoring education', status: 'ACTIVE', totalSteps: 10, completedSteps: 5, patientId: 'p8', patientName: 'Carlos Mendez', startDate: '2026-02-10', targetEndDate: '2026-05-10', diagnosis: 'Type 1 Diabetes', progressPct: 50 },
];

// ─── Enrollments ──────────────────────────────────────────────────────────────

export const MOCK_ENROLLMENTS: Enrollment[] = [
  { id: 'e1', patientId: 'p1', patientName: 'Ahmed Al-Rashidi', patientMrn: 'MRN-00421', pathwayId: 'pw1', pathwayName: 'Diabetes Management', status: 'ACTIVE', enrolledAt: '2026-01-15', enrolledBy: 'Sarah Mitchell', riskLevel: 'HIGH' },
  { id: 'e2', patientId: 'p2', patientName: 'Fatima Al-Zaabi', patientMrn: 'MRN-00422', pathwayId: 'pw2', pathwayName: 'COPD Management', status: 'ACTIVE', enrolledAt: '2026-02-01', enrolledBy: 'James Cooper', riskLevel: 'MEDIUM' },
  { id: 'e3', patientId: 'p4', patientName: 'Khalid Al-Mansoori', patientMrn: 'MRN-00424', pathwayId: 'pw3', pathwayName: 'CKD Care Pathway', status: 'ACTIVE', enrolledAt: '2026-01-20', enrolledBy: 'Priya Sharma', riskLevel: 'CRITICAL' },
  { id: 'e4', patientId: 'p6', patientName: 'Robert Chen', patientMrn: 'MRN-00426', pathwayId: 'pw4', pathwayName: 'Post-MI Rehabilitation', status: 'ACTIVE', enrolledAt: '2026-02-15', enrolledBy: 'Priya Sharma', riskLevel: 'HIGH' },
  { id: 'e5', patientId: 'p7', patientName: 'Aisha Mohammed', patientMrn: 'MRN-00427', pathwayId: 'pw5', pathwayName: 'CHF Management', status: 'ACTIVE', enrolledAt: '2025-12-01', enrolledBy: 'Sarah Mitchell', riskLevel: 'CRITICAL' },
  { id: 'e6', patientId: 'p3', patientName: 'Maria Santos', patientMrn: 'MRN-00423', pathwayId: 'pw6', pathwayName: 'Hypertension Management', status: 'ACTIVE', enrolledAt: '2026-03-01', enrolledBy: 'Sarah Mitchell', riskLevel: 'LOW' },
  { id: 'e7', patientId: 'p5', patientName: 'Lindiwe Dlamini', patientMrn: 'MRN-00425', pathwayId: 'pw7', pathwayName: 'Gestational Diabetes', status: 'COMPLETED', enrolledAt: '2026-01-10', enrolledBy: 'James Cooper', completedAt: '2026-04-01', riskLevel: 'LOW' },
  { id: 'e8', patientId: 'p8', patientName: 'Carlos Mendez', patientMrn: 'MRN-00428', pathwayId: 'pw8', pathwayName: 'T1DM Self-Management', status: 'ACTIVE', enrolledAt: '2026-02-10', enrolledBy: 'James Cooper', riskLevel: 'MEDIUM' },
];

// ─── Team Members ─────────────────────────────────────────────────────────────

export const MOCK_TEAM = [
  { id: 'u1', name: 'Sarah Mitchell', email: 'sarah.mitchell@padma.dev', role: 'System Administrator', roleCode: 'admin', status: 'ACTIVE', patientsAssigned: 3, tasksOpen: 8, lastActive: '2026-04-04' },
  { id: 'u2', name: 'James Cooper', email: 'james.cooper@padma.dev', role: 'Care Coordinator', roleCode: 'care_coordinator', status: 'ACTIVE', patientsAssigned: 3, tasksOpen: 4, lastActive: '2026-04-04' },
  { id: 'u3', name: 'Priya Sharma', email: 'priya.sharma@padma.dev', role: 'Care Coordinator', roleCode: 'care_coordinator', status: 'ACTIVE', patientsAssigned: 2, tasksOpen: 6, lastActive: '2026-04-03' },
  { id: 'u4', name: 'Dr. Omar Hassan', email: 'omar.hassan@padma.dev', role: 'Physician', roleCode: 'physician', status: 'ACTIVE', patientsAssigned: 0, tasksOpen: 1, lastActive: '2026-04-02' },
  { id: 'u5', name: 'Nurse Rania Khalil', email: 'rania.khalil@padma.dev', role: 'Nurse', roleCode: 'nurse', status: 'ACTIVE', patientsAssigned: 0, tasksOpen: 2, lastActive: '2026-04-04' },
];

// ─── Activity Feed ────────────────────────────────────────────────────────────

export const MOCK_ACTIVITY = [
  { id: 'a1', type: 'task_completed', message: 'Medication reconciliation completed for Khalid Al-Mansoori', user: 'Priya Sharma', time: '10 min ago', icon: 'check' },
  { id: 'a2', type: 'alert', message: 'CHF weight alert triggered — Aisha Mohammed gained 2.3 kg in 48h', user: 'System', time: '32 min ago', icon: 'alert' },
  { id: 'a3', type: 'enrollment', message: 'Gestational Diabetes pathway completed for Lindiwe Dlamini', user: 'James Cooper', time: '1 hr ago', icon: 'enrollment' },
  { id: 'a4', type: 'task_overdue', message: 'Nephrology referral overdue for Khalid Al-Mansoori', user: 'System', time: '2 hr ago', icon: 'overdue' },
  { id: 'a5', type: 'pathway', message: 'New pathway step added to Post-MI Rehabilitation', user: 'Dr. Omar Hassan', time: '3 hr ago', icon: 'pathway' },
  { id: 'a6', type: 'task_completed', message: 'COPD follow-up call in progress — Fatima Al-Zaabi', user: 'James Cooper', time: '4 hr ago', icon: 'check' },
];
