# Padma - Care Coordination Platform: Technical Architecture Plan

## Context

Padma is a new standalone **clinical pathway and care coordination platform** that orchestrates chronic care management (diabetes, hypertension, rehabilitation, etc.) through evidence-based, stateful clinical pathways with decision nodes and branching logic. It integrates with existing live systems — **Athma** (PMS/EHR), **Medha** (analytics), **Genesys** (telephony), **Salesforce** (CRM), and **Zeal** (sibling healthcare platform) — exclusively via APIs and events.

**Core concept:** A Clinical Pathway is a stateful workflow engine with stages (e.g., Assessment → Initial Treatment → Intensification → Monitoring → Graduation). Each stage has its own care plan interventions, and transitions between stages are driven by decision nodes based on clinical outcomes (e.g., if HbA1c > 8% after 3 months → escalate to insulin pathway).

**Hierarchy:** `Clinical Pathway → Stages → Interventions → Tasks`

**Current implementation note (April 2026):** The core pathway engine, visual pathway builder, named care-team master, care-task template library, patient enrollment/start/transition workflow, task assignment/completion, internal care-team chat, communication templates, async outbound communication queue, privacy consent UI/APIs, and single-page patient pathway monitor are implemented in the Padma repo. Remaining gaps are mainly around formal program/subscription models, device/clinical observation ingestion, automated risk scoring, real-time SSE, and deeper external-system integration.

**Care Settings:** The platform supports patients across **outpatient**, **inpatient**, and **home care** settings — and patients who transition between them. Care setting is a first-class dimension on pathways, stages, tasks, and communication.

---

## 1. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend | NestJS + TypeScript | Aligns with Zeal ecosystem; shared team expertise |
| Frontend | Next.js 14 (App Router) + React 18 | Same as Zeal; shadcn/ui + Tailwind CSS |
| Database | PostgreSQL 16 | JSONB for flexible schemas; FOR UPDATE SKIP LOCKED for job queues |
| ORM | Prisma | Type-safe queries; schema-as-code |
| Cache / Pub-Sub | Redis 7 | Caching, real-time SSE fan-out, rate limiting |
| Job Queue | PostgreSQL-backed (PadmaJob) | Proven Zeal PRM pattern; no extra infra |
| Real-time | SSE via Redis Pub/Sub | Unidirectional dashboard updates; native NestJS support |
| State Mgmt | TanStack Query + Zustand | Same as Zeal frontend |
| Templates | Mustache | Message template rendering |
| Containers | Docker + docker-compose | Local dev and deployment |

---

## 2. Data Model — Clinical Pathway Hierarchy

### 2.1 Design-Time Models (Templates)

```
ClinicalPathway (top-level blueprint)
 ├── PathwayStage[] (ordered stages in the workflow)
 │    ├── StageInterventionTemplate[] (interventions within this stage)
 │    └── StageTransitionRule[] (decision nodes: when/how to move to next stage)
 └── metadata (category, version, source system)
```

### 2.2 Runtime Models (Patient Instances)

```
PatientPathwayEnrollment (patient enrolled in a pathway)
 ├── currentStageId (which stage the patient is currently in)
 ├── PatientStageHistory[] (audit trail of stage transitions)
 ├── CareTask[] (generated from current stage's interventions)
 ├── CareChatMessage[] (internal care-team thread + system updates)
 └── adherence metrics (denormalized)
```

---

## 3. Database Schema (padma_core)

### ClinicalPathway
The top-level evidence-based protocol (e.g., "ADA Type 2 Diabetes Management Pathway").
```
- id, tenantId
- code             ("diabetes-type2-ada-2026")
- name             ("Type 2 Diabetes Management Pathway")
- description
- category         (diabetes | hypertension | cardiac | rehab | respiratory | oncology | wellness | custom)
- applicableSettings (JSONB array — which care settings this pathway supports)
                     ["outpatient", "inpatient", "home_care"] or subset
- version          (integer, supports versioning)
- defaultDurationDays  (expected total duration, e.g., 365)
- externalSourceSystem ("athma" if synced from Product Configurator)
- externalSourceId
- careTeamId       (optional FK to named CareTeam master; default care team for enrollments)
- status           (draft | active | deprecated | archived)
- createdBy, createdAt, updatedBy, updatedAt
- Indexes: [tenantId, code, version] unique; [tenantId, category, status]; [tenantId, careTeamId]
```

### PathwayStage
Ordered stages within a pathway. Each stage represents a clinical phase.
```
- id, tenantId, pathwayId
- code             ("assessment", "initial_treatment", "intensification", "monitoring", "graduation")
- name             ("Initial Assessment & Baseline")
- description
- stageType        (entry | intermediate | decision | terminal)
                    entry = first stage; terminal = graduation/discharge/dropout
- careSetting      (outpatient | inpatient | home_care | any)
                    Defines the expected care setting for this stage.
                    "any" = setting-agnostic (works in all settings).
                    A stage transition can also be a setting transition
                    (e.g., inpatient "Post-Surgery" → home_care "Home Rehab")
- sortOrder        (display/execution order)
- expectedDurationDays  (how long patient typically stays in this stage)
- minDurationDays  (minimum before transition is allowed)
- autoTransition   (boolean — auto-evaluate transition rules when stage duration met?)
- entryActions     (JSON — actions to execute on stage entry)
                    e.g., [{"action": "generate_tasks"}, {"action": "notify_coordinator"}, {"action": "send_welcome_message"}]
- exitActions      (JSON — actions on stage exit)
                    e.g., [{"action": "cancel_pending_tasks"}, {"action": "recalculate_adherence"}]
- metadata         (JSONB — stage-specific config)
- Indexes: [tenantId, pathwayId, sortOrder]
```

### StageInterventionTemplate
Interventions belonging to a specific stage (what tasks to generate when patient enters this stage).
```
- id, tenantId, stageId
- interventionType  (consultation | lab_test | medication | therapy | nutrition | follow_up | assessment | education
                     | vital_signs | device_reading | telehealth | home_visit | bedside_monitoring | discharge_planning)
- name              ("HbA1c Test", "Endocrinologist Consultation")
- description
- careSetting       (outpatient | inpatient | home_care | any)
                     Allows same stage to have setting-specific interventions.
                     E.g., "Monitoring" stage: outpatient → clinic visit; home_care → telehealth + device reading
- deliveryMode      (in_person | telehealth | remote_monitoring | self_report | app_based)
                     How the intervention is delivered — varies by care setting
- frequencyType     (once | daily | weekly | biweekly | monthly | quarterly | custom_days)
- frequencyValue    (for custom_days: every N days)
- startDayOffset    (relative to stage entry date, default 0)
- endDayOffset      (null = runs through stage end/transition)
- defaultOwnerRole  (care_coordinator | physician | nurse | nutritionist)
- autoCompleteSource    (athma_opd | athma_lab | athma_pharmacy | athma_inpatient | device_sync | telehealth | home_visit | patient_self_report | manual | none)
- autoCompleteEventType (event type to listen for)
- priority          (1=low, 2=medium, 3=high, 4=urgent)
- isCritical        (triggers escalation if overdue)
- reminderConfig    (JSONB — channels, beforeDueDays, overdueIntervalHours)
- metadata          (JSONB — type-specific: test codes, drug info, specialty, dosage)
- sortOrder
- Indexes: [tenantId, stageId, sortOrder]
```

### CareTaskTemplate (Tenant-Level Reusable Library)
Reusable task/intervention templates that admins can select from in the pathway builder. When a template is selected, Padma copies it into `StageInterventionTemplate` so each stage keeps its own editable snapshot.
```
- id, tenantId
- interventionType, name, description
- careSetting, deliveryMode
- frequencyType, frequencyValue
- startDayOffset, endDayOffset
- defaultOwnerRole
- autoCompleteSource, autoCompleteEventType
- priority, isCritical, isActive
- reminderConfig, metadata
- createdBy, createdAt, updatedBy, updatedAt
- Indexes: [tenantId, isActive, name]; [tenantId, interventionType, careSetting]
```

### StageTransitionRule (Decision Nodes)
Rules that define when and how a patient moves between stages. This is the branching/decision logic.
```
- id, tenantId, pathwayId
- fromStageId       (current stage)
- toStageId         (target stage to transition to)
- ruleName          ("Escalate to Intensification if HbA1c uncontrolled")
- ruleDescription
- triggerType       (outcome_based | time_based | manual | event_based)
                     outcome_based = clinical result meets criteria
                     time_based = stage duration elapsed
                     manual = coordinator decides
                     event_based = external event from Athma
- conditionExpr     (JSONB — JSON DSL for evaluation)
  Examples:
  // Outcome-based: HbA1c > 8% after 3 months
  { "and": [
    { "field": "lab_result.HBA1C.value", "op": "gt", "value": 8 },
    { "field": "stage.daysElapsed", "op": "gte", "value": 90 }
  ]}

  // Time-based: patient has been in stage for 180 days
  { "field": "stage.daysElapsed", "op": "gte", "value": 180 }

  // Composite: good control AND compliant
  { "and": [
    { "field": "lab_result.HBA1C.value", "op": "lte", "value": 7 },
    { "field": "enrollment.adherencePercent", "op": "gte", "value": 80 },
    { "field": "stage.daysElapsed", "op": "gte", "value": 90 }
  ]}

- priority          (when multiple rules match, highest priority wins)
- isAutomatic       (boolean — execute automatically or propose to coordinator for approval?)
- transitionActions (JSONB — actions on transition)
                     e.g., [{"action": "notify_physician"}, {"action": "send_patient_message", "templateCode": "stage_transition"}]
- isActive
- Indexes: [tenantId, fromStageId, isActive, priority]
```

### PatientPathwayEnrollment (Runtime)
When a patient is enrolled in a clinical pathway.
```
- id, tenantId, patientId
- pathwayId, pathwayVersion
- patientDisplayName, patientMrn, patientGender, patientDob  (denormalized snapshot)
- enrollmentDate, startDate, expectedEndDate, actualEndDate
- currentStageId    (FK to PathwayStage — which stage the patient is in NOW)
- currentStageEnteredAt  (when they entered the current stage)
- currentCareSetting (outpatient | inpatient | home_care) — patient's ACTUAL current setting
- previousStageId   (for quick reference)
- primaryCoordinatorId
- careTeam          (JSONB — [{userId, role, name}])
- status            (active | paused | completed | cancelled | graduated | dropped_out)
- statusReason      (free text or code for why status changed)
- totalTasks, completedTasks, overdueTasks, adherencePercent  (denormalized)
- athmaPatientId, athmaProductId  (external refs)
- clinicalData      (JSONB — cached clinical values used by transition rules)
                     e.g., {"latest_hba1c": 7.2, "latest_bp_systolic": 130, "bmi": 28.5}
- notes
- createdBy, createdAt, updatedBy, updatedAt
- Indexes: [tenantId, patientId, status]; [tenantId, currentStageId, status]; [tenantId, primaryCoordinatorId, status]
```

### CareTeam + CareTeamMember (Named Care Team Master)
Tenant-level named care teams are reusable groups that can be mapped to a pathway and copied into the enrollment snapshot. This is separate from a single patient's care-team assignment.
```
- CareTeam: id, tenantId, name, description, isActive, createdBy, updatedBy
- CareTeamMember: careTeamId, userId, roleId, facilityId, addedBy, addedAt
- ClinicalPathway.careTeamId maps a default named team to a pathway
- PatientPathwayEnrollment.careTeam remains the runtime snapshot copied at enrollment time
- Primary coordinator can be derived from the mapped care team's care_coordinator member
- APIs support named team CRUD, member add/remove, member listing, and pathway mapping
```

### PatientStageHistory (Stage Transition Audit Trail)
```
- id, tenantId, enrollmentId
- fromStageId, fromStageName
- toStageId, toStageName
- transitionRuleId  (which rule triggered this, null if manual)
- transitionType    (automatic | manual | coordinator_approved)
- reason            (text explanation)
- clinicalDataSnapshot  (JSONB — clinical values at time of transition)
- performedBy       (userId)
- transitionedAt
- Indexes: [tenantId, enrollmentId, transitionedAt DESC]
```

### CareTask
Individual actionable tasks generated from stage interventions.
```
- id, tenantId, patientId, enrollmentId
- stageId           (which stage generated this task)
- interventionTemplateId
- interventionType, title, description
- careSetting       (outpatient | inpatient | home_care)
- deliveryMode      (in_person | telehealth | remote_monitoring | self_report | app_based)
- dueDate, dueTime, windowStartDate, windowEndDate
- occurrenceNumber, totalOccurrences
- assignedToUserId, assignedToRole
- priority, isCritical
- status            (pending | upcoming | active | completed | auto_completed | skipped | cancelled | overdue)
- completedAt, completedBy, completionMethod  (manual | auto_athma_opd | auto_athma_lab | auto_athma_pharmacy | auto_athma_inpatient | auto_device_sync | patient_self_report | telehealth_completed | home_visit_completed)
- completionEvidence  (JSONB — source system, entity ref, details)
- autoCompleteSource, autoCompleteEventType
- escalationLevel, lastEscalatedAt
- lastReminderSentAt, reminderCount, nextReminderAt
- metadata          (JSONB)
- createdAt, createdBy, updatedAt
- Indexes: [tenantId, patientId, status, dueDate]; [tenantId, enrollmentId, stageId, status]; [tenantId, assignedToUserId, status, dueDate]; [tenantId, autoCompleteEventType, status]; [tenantId, nextReminderAt, status]
```

### CareTaskEvent (Audit Trail)
```
- id, tenantId, taskId
- eventType         (created | status_changed | assigned | escalated | reminder_sent | auto_completed | note_added)
- fromStatus, toStatus
- payload           (JSONB)
- performedBy
- createdAt
```

### CareChatMessage (Internal Care-Team Chat)
Internal patient/enrollment care-team thread. User messages support care-team discussion; system messages are posted automatically for pathway and task lifecycle events.
```
- id, tenantId
- patientId, enrollmentId, pathwayId, stageId, taskId
- messageType       (user | system)
- eventType         (enrollment_created | pathway_started | stage_transitioned | tasks_generated | task_completed | task_assigned | etc.)
- body
- metadata          (JSONB — structured event context)
- createdBy, createdAt, editedAt, deletedAt
- Indexes: [tenantId, patientId, createdAt DESC]; [tenantId, enrollmentId, createdAt DESC]; [tenantId, taskId, createdAt DESC]
```

### EscalationRule
```
- id, tenantId
- name, description
- triggerType       (task_overdue | task_critical_overdue | patient_inactive | adherence_below_threshold)
- conditionExpr     (JSONB — JSON DSL)
- escalationChain   (JSONB — ordered actions)
                     [{level: 1, action: "send_reminder", channel: "whatsapp", delayHours: 0},
                      {level: 2, action: "notify_coordinator", delayHours: 24},
                      {level: 3, action: "schedule_call", channel: "genesys", delayHours: 48},
                      {level: 4, action: "alert_supervisor", delayHours: 72}]
- priority, isActive
- createdBy, createdAt, updatedAt
```

### PatientSegment
```
- id, tenantId, name, description
- filterExpr        (JSONB — JSON DSL filter)
- cachedCount, lastRefreshedAt
- isActive, createdBy, createdAt
```

### PadmaJob (Durable Queue)
```
- id, tenantId
- jobType           (GENERATE_TASKS | SEND_REMINDER | ESCALATE_TASK | AUTO_COMPLETE_CHECK | EVALUATE_TRANSITIONS | SYNC_ATHMA | ADHERENCE_RECALC | STAGE_ENTRY_ACTIONS)
- patientId, enrollmentId, taskId
- payload           (JSONB)
- runAt, status     (READY | RUNNING | DONE | FAILED | SKIPPED | DEAD)
- attempts, maxAttempts, lockedAt, lockedBy, lastError
- idempotencyKey    (unique per tenant)
```

### Engagement Database (padma_engagement)
Same structure as Zeal PRM: `CommunicationTemplate`, `PatientPreference`, `PatientMessage`, `ProviderCallback`

---

## 4. Clinical Pathway Engine — How It Works

### 4.1 Pathway Lifecycle

```
1. DESIGN TIME: Admin creates Clinical Pathway
   → Define stages (Assessment → Treatment → Monitoring → Graduation)
   → Define interventions per stage (labs, consults, meds)
   → Define transition rules with conditions (decision nodes)
   → Publish pathway (status: active)

2. ENROLLMENT: Coordinator enrolls patient
   → Create PatientPathwayEnrollment
   → Set currentStage = entry stage (e.g., "Assessment")
   → Status starts as pending; coordinator explicitly starts the pathway
   → On start: log PatientStageHistory, execute entry actions, generate stage tasks
   → Post system update into the internal care-team chat

3. IN-STAGE: Patient progresses through interventions
   → Tasks are completed (manual, auto-completed via Athma webhooks, or self-reported)
   → Reminders sent for pending/overdue tasks
   → Escalation rules fire for critical overdue tasks
   → Clinical data updated (lab results feed into clinicalData JSONB)
   → Task creation, assignment, status changes, completion, escalation, and cancellation are logged as CareTaskEvent and posted to care chat

4. TRANSITION EVALUATION: Periodic + event-triggered
   → TransitionEvaluator checks all active transition rules for current stage
   → If conditionExpr evaluates to TRUE:
     - If isAutomatic=true: execute transition immediately
     - If isAutomatic=false: create "transition proposal" for coordinator review
   → On transition:
     - Execute current stage exitActions (cancel pending tasks, recalc adherence)
     - Log to PatientStageHistory
     - Update currentStageId to toStageId
     - Execute new stage entryActions (generate new tasks, notify team)
     - Post stage-transition system message to care chat

5. TERMINAL STAGE: Patient reaches graduation/dropout
   → Execute final stage actions
   → Set enrollment status to graduated/completed/dropped_out
   → Push final adherence metrics to Medha
```

### 4.2 Transition Evaluation Triggers

Transitions are evaluated when:
1. **Clinical data updated** — Lab result arrives via Athma webhook → update `clinicalData` → evaluate transition rules
2. **Stage duration elapsed** — Daily cron checks `currentStageEnteredAt + expectedDurationDays`
3. **Task milestone reached** — All critical tasks in stage completed → evaluate rules
4. **Manual trigger** — Coordinator clicks "Evaluate Transition" on dashboard

### 4.3 Decision Node Example: Diabetes Pathway

```
Pathway: "Type 2 Diabetes Management"

Stage 1: Assessment (Week 1-2)
  Interventions: Initial HbA1c, Fasting glucose, Lipid panel, Endo consultation
  Transition Rules:
    → IF all assessment tasks completed → go to "Initial Treatment"

Stage 2: Initial Treatment (Month 1-3)
  Interventions: Monthly glucose monitoring, Metformin compliance check, Nutrition counseling
  Transition Rules:
    → IF HbA1c ≤ 7.0 AND daysElapsed ≥ 90 → go to "Monitoring" (good control)
    → IF HbA1c > 8.0 AND daysElapsed ≥ 90 → go to "Intensification" (poor control)
    → IF daysElapsed ≥ 180 → go to "Intensification" (timeout escalation)

Stage 3a: Monitoring (Ongoing)
  Interventions: Quarterly HbA1c, Annual eye exam, Annual foot exam, 6-month Endo follow-up
  Transition Rules:
    → IF HbA1c > 8.0 on any check → go to "Intensification"
    → IF adherencePercent ≥ 90 AND HbA1c ≤ 7.0 for 12 months → go to "Graduation"

Stage 3b: Intensification (Month 3-6)
  Interventions: Insulin initiation consult, Weekly glucose monitoring, Monthly Endo follow-up
  Transition Rules:
    → IF HbA1c ≤ 7.5 AND daysElapsed ≥ 90 → go to "Monitoring"
    → IF no improvement after 6 months → go to "Specialist Referral" (manual transition)

Stage 4: Graduation (Terminal)
  Interventions: Final assessment, Annual follow-up scheduling
  entryActions: [notify_patient_graduation, push_metrics_to_medha]
```

### 4.4 Multi-Setting Support: Outpatient, Inpatient & Home Care

The platform supports patients across all care settings, with setting-specific behavior at every layer:

#### Care Settings & Their Characteristics

| Aspect | Outpatient | Inpatient | Home Care |
|--------|-----------|-----------|-----------|
| **Typical Interventions** | Clinic visits, lab tests, pharmacy pickups, scheduled consults | Bedside monitoring, vitals q4h, nursing assessments, discharge planning | Telehealth, device readings (BP, glucose, SpO2), home nurse visits, self-reported symptoms |
| **Task Ownership** | Care coordinator + patient self-serve | Ward nurse + attending physician | Home care nurse + patient + remote monitoring team |
| **Communication Channel** | WhatsApp, SMS, Email, App | Care channel (bedside), in-person | WhatsApp, Video call, App push notifications |
| **Auto-Completion Source** | Athma OPD Journey, Lab system | Athma Inpatient/Ward system, Nursing charting | Device sync (BP monitor, glucometer), Patient self-report, Telehealth platform |
| **Reminder Strategy** | WhatsApp → SMS → Call | Nurse task board → care channel alert | App push → WhatsApp → Video call → Home visit scheduling |
| **Escalation Path** | Coordinator → Physician → Supervisor | Nurse → Charge nurse → Attending → Supervisor | Remote nurse → On-call physician → Emergency dispatch |

#### Cross-Setting Pathway Example: Post-Cardiac Surgery Rehab

```
Pathway: "Post-CABG Cardiac Rehabilitation"

Stage 1: Post-Op Recovery (Inpatient, Days 1-7)
  careSetting: inpatient
  Interventions:
    - Vitals monitoring q4h (bedside_monitoring, auto-complete: athma_inpatient)
    - Daily cardiac assessment (consultation, in_person)
    - Pain management review (medication, auto-complete: athma_pharmacy)
    - Early mobilization (therapy, in_person)
    - Discharge planning assessment (discharge_planning, in_person)
  Transition Rules:
    → IF discharge_criteria_met AND all critical tasks complete → go to "Early Home Recovery"
    → IF complication_detected → go to "Inpatient Extended" (stays inpatient)

Stage 2: Early Home Recovery (Home Care, Weeks 2-6)
  careSetting: home_care
  Interventions:
    - Daily BP & heart rate monitoring (device_reading, remote_monitoring, auto-complete: device_sync)
    - Weekly telehealth check-in (telehealth, video call)
    - Home nurse visit (2x/week) (home_visit, in_person)
    - Medication adherence check (medication, self_report via app)
    - Wound care assessment (assessment, home_visit)
  Transition Rules:
    → IF 4 weeks completed AND vitals stable AND wound healing → go to "Outpatient Rehab"
    → IF vitals abnormal OR wound complication → go to "Emergency Re-evaluation" (flag for re-admission)

Stage 3: Outpatient Rehab (Outpatient, Weeks 7-18)
  careSetting: outpatient
  Interventions:
    - Cardiac rehab sessions 3x/week (therapy, in_person at clinic)
    - Monthly cardiologist follow-up (consultation, in_person)
    - Monthly blood work (lab_test, auto-complete: athma_lab)
    - Weekly BP self-monitoring (device_reading, remote_monitoring, auto-complete: device_sync)
    - Nutrition counseling bi-weekly (nutrition, in_person or telehealth)
  Transition Rules:
    → IF 12 weeks completed AND stress test normal AND adherence ≥ 80% → go to "Maintenance"
    → IF cardiac event OR poor stress test → go to "Specialist Review" (manual)

Stage 4: Maintenance (Outpatient/Home, Ongoing)
  careSetting: any  (patient chooses outpatient clinic visits or home-based monitoring)
  Interventions:
    - Quarterly cardiologist visit (consultation)
    - Monthly self-monitoring (device_reading, remote_monitoring)
    - Annual stress test (lab_test)
  Transition Rules:
    → IF 1 year stable → go to "Graduation"
```

#### How Setting Transitions Work

When a stage transition also changes the care setting (e.g., inpatient → home_care):

1. **Exit actions of old stage:** Cancel inpatient-specific pending tasks, generate discharge summary request
2. **Setting transition actions (new):**
   - Update `enrollment.currentCareSetting` to new setting
   - Reassign tasks to appropriate team (ward nurse → home care nurse)
   - Switch communication channel preferences (care channel → WhatsApp/App)
   - If home_care: trigger device provisioning workflow (ensure patient has BP monitor, glucometer)
   - If outpatient: schedule first clinic appointment via Athma
3. **Entry actions of new stage:** Generate new setting-appropriate tasks, send patient orientation message

#### Task Generation: Setting-Aware

When generating tasks from stage interventions, the task generator filters by care setting:

```
For each intervention in current stage:
  IF intervention.careSetting == "any" OR intervention.careSetting == enrollment.currentCareSetting:
    → Generate task with appropriate deliveryMode and autoCompleteSource
```

This allows a single stage to have interventions for multiple settings (useful for "any" setting stages like Maintenance).

#### Dashboard: Setting-Aware Views

The coordinator dashboard supports filtering by care setting:
- **Inpatient view:** Ward-style board showing bed-assigned patients, nursing tasks, discharge readiness
- **Outpatient view:** Appointment-centric showing upcoming clinic visits, pending lab orders, overdue follow-ups
- **Home care view:** Remote monitoring alerts, device readings, telehealth schedule, home visit routes

---

## 5. Backend Module Structure

```
padma/backend/services/care-coordination/src/
├── pathways/              # Clinical pathway CRUD + versioning
│   ├── pathways.controller.ts
│   ├── pathways.service.ts
│   ├── stages.service.ts
│   ├── interventions.service.ts
│   └── transitions.service.ts
├── enrollment/            # Patient enrollment + stage management
│   ├── enrollment.controller.ts
│   ├── enrollment.service.ts
│   └── stage-manager.service.ts   # Handles stage entry/exit actions
├── pathway-engine/        # Core engine: transition evaluation + decision nodes
│   ├── pathway-engine.module.ts
│   ├── transition-evaluator.service.ts  # Evaluates conditionExpr against clinical data
│   ├── clinical-data.service.ts         # Manages clinicalData JSONB updates
│   └── condition-evaluator.service.ts   # JSON DSL evaluator (reused for segments, escalation)
├── tasks/                 # Task generation + management
│   ├── tasks.controller.ts
│   ├── tasks.service.ts
│   ├── care-task-templates.controller.ts
│   ├── care-task-templates.service.ts
│   └── task-generator.service.ts    # Generates tasks from stage interventions
├── care-team/             # Named care team master + members + pathway mapping
├── care-chat/             # Internal patient/enrollment care-team chat + system messages
├── reminders/             # FR-3: Automated follow-up
│   ├── reminder-scheduler.service.ts
│   └── reminder-dispatcher.service.ts
├── auto-completion/       # FR-4, FR-5: Real-time status + auto-completion
│   ├── auto-completion.service.ts
│   └── event-listener.service.ts
├── dashboard/             # FR-6: Coordinator dashboard APIs
├── escalation/            # FR-10: Escalation rules engine
├── segments/              # FR-11: Patient segmentation
├── communication/         # FR-9: Templates, consent-aware send requests, async delivery
│   └── channels/
│       ├── athma-trigger.adapter.ts    # WhatsApp/SMS/Email via Athma
│       ├── genesys-call.adapter.ts     # Call scheduling
│       └── salesforce-log.adapter.ts   # History logging
├── integrations/          # FR-15: External system adapters
│   ├── athma/   (client + webhook controller)
│   ├── medha/   (client)
│   ├── genesys/ (client)
│   ├── salesforce/ (client)
│   └── zeal/    (client)
├── jobs/                  # Durable job queue (Postgres SKIP LOCKED)
├── realtime/              # SSE via Redis pub/sub
└── common/                # Guards, filters, decorators, interceptors
```

---

## 6. Frontend Structure

```
padma/frontend/src/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx                    # Coordinator dashboard home
│   │   ├── patients/                   # Patient registry
│   │   │   └── [id]/                  # Single patient page with pathway selector, monitor, tasks, chat, timeline
│   │   ├── pathways/                   # Clinical pathway management
│   │   │   ├── page.tsx               # List all pathways
│   │   │   ├── new/builder            # Create a new pathway through the builder
│   │   │   └── [id]/builder           # Visual pathway builder (stages + transitions)
│   │   ├── enrollment/                # Enrollment worklist + enrollment creation
│   │   ├── tasks/                     # Coordinator task queue
│   │   ├── communications/            # Patient communications inbox/outbound
│   │   ├── communication-templates/   # Template master
│   │   ├── privacy-consent/           # Patient consent recording
│   │   ├── care-team/                 # Named care-team master
│   │   └── settings/                  # Tenant settings, including pathway code format
├── modules/
│   ├── dashboard/      (widgets, charts, adherence overview)
│   ├── pathways/       (pathway builder, stage editor, transition rule builder)
│   ├── enrollment/     (enrollment form, stage timeline visualization)
│   ├── tasks/          (task queue, patient 360 tasks)
│   ├── patients/       (patient list, 360 view with pathway progress)
│   └── communication/  (template management)
├── shared/
│   ├── components/     (shadcn/ui)
│   ├── lib/api/        (Axios with tenant headers)
│   ├── lib/sse/        (SSE client hook)
│   └── hooks/
└── store/              (Zustand)
```

Key UI: **Pathway Builder** — visual editor where admins define stages as nodes in a graph, draw transitions between them, configure conditions for each transition, map a default care team, and add interventions either manually or from the care-task template library. Pathway codes are generated automatically using the tenant's configured code format.

Key UI: **Patient Page** — `/patients/[id]` is the single patient workspace. It includes a reusable patient header, pathway selector, selected pathway monitor, active tasks, stage transition controls, care-team chat, and stage lifecycle timeline. If a patient has multiple pathways, the user selects the pathway on this page instead of navigating to a separate detail screen.

---

## 7. Task Generation Engine

**Strategy: Stage-scoped, rolling window**

1. When patient enters a stage → generate tasks for that stage's interventions (rolling 30-day window)
2. Daily cron extends the window for patients still in the same stage
3. When patient transitions to a new stage → cancel pending tasks from old stage (exit action) → generate tasks for new stage (entry action)
4. Recurring interventions within a stage continue generating until stage transition occurs
5. Generated/cancelled tasks create system care-chat updates for team visibility

This means tasks are always scoped to the current stage. No tasks are generated for future stages (those are triggered by transitions).

### Care Task Template Library

Admins can create tenant-level `CareTaskTemplate` records and reuse them in the visual pathway builder. The builder supports:
- **Create New** intervention directly on a stage
- **Select From Task Template Library** and copy into the stage as a `StageInterventionTemplate`
- Local stage-level edits after copy, without mutating the reusable library template

This keeps reusable operational patterns centralized while preserving stage-owned snapshots for auditability and pathway versioning.

---

## 8. Integration Architecture

### Communication Flow (FR-9)
**Padma decides WHEN and WHAT. Athma sends. Salesforce logs.**

```
Padma → check patient preference (DND, quiet hours)
     → render template (Mustache)
     → create PatientMessage record
     → status = ready_to_send
     → background scheduler claims ready messages
     → dispatch: WhatsApp/SMS/Email → Athma | Call → Genesys
     → update sent/delivery/failure details
     → log to Salesforce when configured
```

Message creation is intentionally asynchronous from delivery: after validation, consent, preference checks, and template rendering succeed, Padma persists the message first. Third-party delivery failure does not prevent message creation.

### Internal Care Chat Flow

Care chat is separate from patient outbound communication. It is an internal care-team thread scoped to patient/enrollment.

```
Care-team user posts note
  → POST /api/v1/enrollments/:enrollmentId/care-chat
  → CareChatMessage(messageType=user)

Pathway/task lifecycle event occurs
  → service posts CareChatMessage(messageType=system)
  → team sees enrollment_created, pathway_started, stage_transitioned,
    tasks_generated, task_completed, task_assigned, task_cancelled, etc.
```

Care chat is currently query/refresh based. SSE can later push live chat/system updates to the patient page.

### Auto-Completion + Transition Trigger Flow (FR-5 + Pathway Engine)
```
Athma webhook → POST /api/v1/webhooks/athma
  → validate HMAC signature
  → persist raw event
  → AutoCompletionService: match event → auto-complete task
  → ClinicalDataService: if lab result → update enrollment.clinicalData
  → TransitionEvaluator: re-evaluate transition rules for affected enrollment
  → if transition rule matches → execute transition (or propose to coordinator)
  → publish SSE events for real-time dashboard
```

This is the key enhancement: **lab results don't just complete tasks — they update clinical data which feeds into transition decision nodes.**

### Athma Events Listened For (by care setting)

**Outpatient:**
- `appointment.completed` → auto-complete consultation tasks
- `lab_result.available` → auto-complete lab tasks + **update clinicalData + evaluate transitions**
- `prescription.dispensed` → auto-complete medication tasks
- `opd_journey.step_completed` → update task status

**Inpatient:**
- `nursing_assessment.completed` → auto-complete bedside monitoring tasks
- `vitals.recorded` → auto-complete vital signs tasks + update clinicalData
- `medication.administered` → auto-complete medication tasks
- `discharge.initiated` → trigger discharge planning tasks
- `discharge.completed` → trigger setting transition (inpatient → home/outpatient)

**Home Care:**
- `device_reading.received` → auto-complete device monitoring tasks + update clinicalData (BP, glucose, SpO2, weight)
- `telehealth_session.completed` → auto-complete telehealth tasks
- `home_visit.completed` → auto-complete home visit tasks
- `patient_self_report.submitted` → auto-complete self-report tasks (medication adherence, symptom diary)

### Medha Integration (FR-13)
Push adherence metrics + pathway stage distribution + transition outcomes to Medha for analytics dashboards.

---

## 9. Adaptive Reminder Strategy (FR-3)

| Timing | Action |
|--------|--------|
| 3 days before due | WhatsApp/SMS gentle reminder |
| Due today | WhatsApp/SMS with urgency |
| Overdue day 1 | WhatsApp + Email |
| Overdue day 3 | SMS + coordinator notification |
| Overdue day 7+ | Genesys call + supervisor alert |

Configurable per intervention template via `reminderConfig` JSON.

---

## 10. API Endpoints

### Clinical Pathways
- `GET/POST /api/v1/pathways` — list/create pathways
- `GET/PUT /api/v1/pathways/:id` — get/update pathway with stages + transitions
- `POST /api/v1/pathways/:id/publish` — activate pathway
- `POST /api/v1/pathways/:id/clone` — version a pathway
- `POST /api/v1/pathways/sync-athma` — pull from Athma Product Configurator
- Pathway code is generated automatically on create when omitted, using tenant setting `featureFlags.pathwayCodeFormat`

### Pathway Stages & Transitions
- `GET/POST /api/v1/pathways/:id/stages` — manage stages
- `GET/POST /api/v1/pathways/:id/transitions` — manage transition rules
- `GET/POST /api/v1/stages/:id/interventions` — manage stage interventions

### Care Teams
- `GET/POST /api/v1/care-team/teams` — named care-team master
- `GET/PUT/DELETE /api/v1/care-team/teams/:id` — manage a named care team
- `POST/DELETE /api/v1/care-team/teams/:id/members` — add/remove members
- `GET /api/v1/care-team/members` — tenant care-team member directory

### Care Task Templates
- `GET/POST /api/v1/care-task-templates` — reusable tenant task template library
- `GET/PUT/DELETE /api/v1/care-task-templates/:id` — manage a reusable task template

### Patient Enrollment
- `POST /api/v1/enrollments` — create enrollment; patientId may be supplied or generated
- `POST /api/v1/patients/:patientId/enroll` — enroll in pathway
- `GET /api/v1/patients/:patientId/enrollments` — list enrollments
- `GET /api/v1/enrollments/:id` — enrollment detail with stage history + tasks
- `POST /api/v1/enrollments/:id/start` — start pending enrollment and enter first stage
- `GET /api/v1/enrollments/:id/stage-history` — transition audit trail
- `GET /api/v1/enrollments/:id/transition-readiness` — whether current-stage tasks allow transition
- `POST /api/v1/enrollments/:id/transition` — manual stage transition
- `GET /api/v1/enrollments/:id/proposed-transitions` — evaluate transition rules
- `POST /api/v1/enrollments/:id/pause|resume|cancel|complete`

### Patients
- `GET /api/v1/patients` — enrolled patient registry aggregated from enrollment snapshots
- `GET /api/v1/patients/search` — typeahead patient search by name/MRN

### Tasks
- `GET /api/v1/tasks` — coordinator task queue
- `GET /api/v1/patients/:patientId/tasks` — patient-level task history across enrollments
- `GET /api/v1/enrollments/:id/tasks` — tasks for an enrollment
- `GET /api/v1/tasks/:id` — task detail with task events
- `PUT /api/v1/tasks/:id/status` — status change from task drawer/detail
- `POST /api/v1/tasks/:id/complete|skip|escalate|reassign`

### Care Chat
- `GET /api/v1/enrollments/:enrollmentId/care-chat` — enrollment-scoped care-team thread
- `POST /api/v1/enrollments/:enrollmentId/care-chat` — post internal care-team note
- `GET /api/v1/patients/:patientId/care-chat` — patient-level internal care-chat history

### Dashboard
- `GET /api/v1/dashboard/summary|overdue-tasks|upcoming-tasks|adherence-overview|my-patients`
- `GET /api/v1/dashboard/pathway-distribution` — patients per stage per pathway
- `GET /api/v1/dashboard/pending-transitions` — transitions awaiting coordinator approval

### Communication & Privacy
- `GET/POST /api/v1/communication/templates` — template master
- `GET /api/v1/communication/templates/:id` — template detail
- `POST /api/v1/communication/templates/:id/approve` — approve template
- `POST /api/v1/communication/send` — validate/render/persist ready-to-send patient message
- `GET /api/v1/communication/messages` — tenant-wide communication history
- `GET /api/v1/patients/:patientId/messages` — patient message history
- `GET/POST/DELETE /api/v1/privacy/consents/:patientId` — patient consent records
- `GET /api/v1/privacy/dsar/:patientId` and `POST /api/v1/privacy/erasure/:patientId` — privacy operations

### Webhooks (inbound)
- `POST /api/v1/webhooks/athma`
- `POST /api/v1/webhooks/salesforce`
- `POST /api/v1/webhooks/genesys`

### Real-time (Planned)
- `GET /api/v1/sse/dashboard` — planned dashboard SSE stream
- `GET /api/v1/sse/patient/:patientId` — planned patient-specific SSE stream

---

## 11. Security, VAPT Hardening & GDPR/Privacy Compliance

### 11.1 Authentication & Authorization (VAPT: Auth bypass prevention)

- **JWT with RS256** — asymmetric signing (public/private key pair); tokens validated on every request via NestJS guard
- **Token expiry:** Access token = 15 min, Refresh token = 7 days (httpOnly, secure, sameSite=strict cookie)
- **OIDC SSO:** Shared identity provider with Zeal ecosystem; no local password storage in Padma
- **MFA enforcement:** High-privilege roles (admin, supervisor) require TOTP/SMS MFA
- **RBAC with permission matrix:**
  | Role | Pathways | Enrollments | Tasks | Dashboard | Settings | Patient Data |
  |------|----------|-------------|-------|-----------|----------|-------------|
  | admin | CRUD | CRUD | CRUD | Full | CRUD | Full |
  | supervisor | Read | CRUD | CRUD | Full | Read | Full |
  | care_coordinator | Read | CRUD | CRUD | Own patients | None | Assigned only |
  | physician | Read | Read | Complete own | Own patients | None | Assigned only |
  | nurse | Read | Read | Complete own | Own patients | None | Assigned only |
  | viewer | Read | Read | Read | Read | None | Anonymized |
- **Row-level access control:** Coordinators can ONLY see enrollments/tasks assigned to them (enforced at query level, not just UI)
- **Session management:** Concurrent session limit per user; session revocation on password change/role change

### 11.2 Multi-Tenancy Isolation (VAPT: Tenant data leakage)

- **Tenant context middleware:** Extract and validate `x-tenant-id` from JWT claims (NOT from user-supplied header alone)
- **Prisma middleware:** Auto-inject `WHERE tenant_id = ?` on ALL queries; auto-set `tenant_id` on ALL inserts
- **Defense in depth:** PostgreSQL Row-Level Security (RLS) policies as a second barrier — even if Prisma middleware bypassed, DB enforces tenant isolation
  ```sql
  CREATE POLICY tenant_isolation ON care_tasks
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
  ```
- **Cross-tenant test:** Automated integration tests that attempt cross-tenant data access and assert 0 results
- **Tenant ID in all indexes:** Every index starts with `tenant_id` to prevent full table scans

### 11.3 Input Validation & Injection Prevention (VAPT: OWASP Top 10)

- **SQL Injection:** Prisma ORM with parameterized queries exclusively. NO raw SQL. Prisma's query engine prevents injection by design.
- **NoSQL/JSON Injection:** JSON DSL condition expressions (transition rules, escalation rules, segment filters) are validated against a strict Zod schema BEFORE storage. Only whitelisted operators (`eq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `contains`) and field paths allowed. No `eval()`, no dynamic code execution.
  ```typescript
  const ConditionExprSchema = z.object({
    field: z.string().regex(/^[a-zA-Z0-9_.]+$/),  // Only alphanumeric + dots
    op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  });
  ```
- **XSS Prevention:**
  - All user-generated content (care plan names, notes, descriptions) is sanitized using `DOMPurify` before storage AND on output
  - React's default JSX escaping prevents reflected XSS
  - Content-Security-Policy (CSP) headers: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
- **SSRF Prevention:** All outbound HTTP calls to Athma/Medha/Genesys/Salesforce use an allowlist of configured base URLs. No user-supplied URLs in any API field.
- **Template Injection:** Mustache templates for messages are pre-validated; only whitelisted variables (`{{patient.name}}`, `{{task.title}}`, `{{task.dueDate}}`). No nested template execution.
- **Mass Assignment:** DTOs use explicit `class-validator` decorators with `whitelist: true` and `forbidNonWhitelisted: true` in NestJS `ValidationPipe`
  ```typescript
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  ```

### 11.4 API Security (VAPT: Rate limiting, DoS, Broken Access)

- **Rate limiting:** `@nestjs/throttler` — 100 req/min per user for standard endpoints; 10 req/min for sensitive endpoints (enrollment, transition); 5 req/min for webhook endpoints
- **Request size limit:** 1MB max body size (protects against large payload attacks)
- **Helmet middleware:** Sets security headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy)
- **CORS:** Strict origin allowlist per tenant (configurable); no wildcard origins
- **HTTPS only:** `Strict-Transport-Security: max-age=31536000; includeSubDomains` enforced
- **API versioning:** `/api/v1/` prefix; old versions deprecated with sunset headers
- **Idempotency keys:** All POST endpoints accept `Idempotency-Key` header to prevent duplicate operations (enrollment, task completion, message sending)
- **IDOR protection:** All resource access validated against tenant + user ownership. `GET /tasks/:id` checks that the task belongs to the user's tenant AND the user has permission to view it.

### 11.5 Webhook Security (VAPT: Webhook spoofing)

- **HMAC-SHA256 signature verification:** Every inbound webhook from Athma/Salesforce/Genesys must include `X-Signature-256` header. Padma recomputes HMAC using shared secret and rejects mismatches.
  ```typescript
  const expectedSignature = crypto.createHmac('sha256', webhookSecret)
    .update(rawBody).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new UnauthorizedException('Invalid webhook signature');
  }
  ```
- **Timestamp validation:** Reject webhooks with timestamps older than 5 minutes (replay attack prevention)
- **IP allowlisting:** Optional IP allowlist per webhook source (configurable)
- **Raw payload persistence:** All webhook payloads stored in `webhook_events` table before processing (for forensic replay and audit)
- **Idempotency:** Webhook processing is idempotent — duplicate webhook deliveries don't cause duplicate task completions

### 11.6 Data Encryption

- **At rest:** PostgreSQL Transparent Data Encryption (TDE) for both databases. Alternatively, application-level encryption for sensitive fields using AES-256-GCM via `@nestjs/crypto`
- **In transit:** TLS 1.2+ enforced on all connections (API, database, Redis, inter-service)
- **Secrets management:** All API keys, HMAC secrets, JWT signing keys, database credentials stored in environment variables (never in code). In production: AWS Secrets Manager or HashiCorp Vault.
- **Encryption at field level for PHI:**
  - `patientDisplayName`, `patientMrn`, `patientDob` — encrypted at application level before storage
  - Decrypted only when needed for display
  - Encryption key rotation supported without data migration (envelope encryption pattern)

### 11.7 GDPR & Privacy Compliance

#### 11.7.1 Lawful Basis & Consent
- **Lawful basis:** Legitimate interest (healthcare provision) + explicit patient consent for communication
- **Consent tracking:** `PatientConsent` model in padma_engagement:
  ```
  - id, tenantId, patientId
  - consentType        (data_processing | communication_whatsapp | communication_sms | communication_email | communication_call | data_sharing_medha | data_sharing_salesforce)
  - status             (granted | withdrawn | expired)
  - grantedAt, withdrawnAt, expiresAt
  - consentVersion     (tracks which privacy policy version)
  - collectionMethod   (app | paper | verbal_recorded)
  - ipAddress, userAgent  (proof of digital consent)
  ```
- **Consent enforcement:**
  - Communication service checks `PatientConsent` before EVERY message dispatch. No consent = no message.
  - Data sharing to Medha/Salesforce checks consent for those specific purposes
  - Consent withdrawal immediately stops all outbound communications

#### 11.7.2 Data Minimization (GDPR Article 5(1)(c))
- Padma stores **minimum necessary PHI:** display name, MRN, DOB, gender only
- Full medical records remain in Athma/Zeal — Padma never stores clinical notes, diagnoses, or detailed lab reports
- `clinicalData` JSONB stores only aggregate values needed for transitions (e.g., `latest_hba1c: 7.2`) — not raw lab reports
- Communication templates use variable references, not embedded patient data
- Logs and audit trails contain entity IDs, not patient names (lookup on demand)

#### 11.7.3 Right to Access (GDPR Article 15) — Data Subject Access Request (DSAR)
- **API endpoint:** `GET /api/v1/privacy/dsar/:patientId` — generates a complete data export:
  - All enrollments, stage history, tasks, task events
  - All messages sent (channel, timestamp, template used)
  - All consent records
  - All preferences
  - Output: JSON or PDF format
- **Access log:** Every DSAR request is logged in audit trail

#### 11.7.4 Right to Erasure (GDPR Article 17) — Right to Be Forgotten
- **API endpoint:** `POST /api/v1/privacy/erasure/:patientId`
- **Erasure process:**
  1. Anonymize patient data across all tables (replace name with hash, clear MRN, DOB, gender)
  2. Retain anonymized task/enrollment records for clinical audit compliance (healthcare exception under GDPR Article 17(3)(c))
  3. Delete all messages and communication preferences
  4. Delete consent records (or mark as "erased")
  5. Notify downstream systems (Salesforce, Medha) to purge patient data
  6. Log erasure request and completion in audit trail (without patient identifiers)
- **Soft-delete pattern:** `erasedAt` timestamp on patient-related records; queries automatically exclude erased records

#### 11.7.5 Right to Data Portability (GDPR Article 20)
- DSAR endpoint supports structured, machine-readable export (JSON)
- FHIR R4 CarePlan resource format supported for healthcare interoperability

#### 11.7.6 Data Retention Policy
- **Active enrollments:** Retained while active
- **Completed/cancelled enrollments:** Retained for 7 years (healthcare regulatory requirement), then auto-anonymized
- **Messages:** Retained for 3 years, then purged
- **Audit logs:** Retained for 10 years (append-only, immutable)
- **Webhook raw payloads:** Retained for 90 days, then purged
- **Retention enforced by:** Scheduled job (`DataRetentionJob`) runs weekly to anonymize/purge expired records

#### 11.7.7 Data Processing Records (GDPR Article 30)
- Maintained automatically via audit trail:
  - Who accessed what patient data, when, why (API access logs)
  - What data was shared with which external system (integration logs)
  - What communications were sent (message logs)

#### 11.7.8 Privacy by Design
- **Purpose limitation:** Each integration adapter only sends the minimum data needed
  - Salesforce: patient ID + communication summary (no clinical data)
  - Medha: anonymized adherence metrics (no PII unless consented)
  - Genesys: patient ID + callback reason (no clinical details)
- **Pseudonymization:** Internal processing uses patient UUIDs; display names resolved only at API response layer
- **Data breach notification:** If breach detected, system can enumerate affected patients via audit trail within 72 hours (GDPR Article 33 requirement)

### 11.8 Secure Development Practices

- **Dependency scanning:** `npm audit` + Snyk/Dependabot in CI pipeline; fail build on high/critical vulnerabilities
- **SAST (Static Application Security Testing):** SonarQube or Semgrep in CI pipeline scanning for:
  - Hardcoded secrets
  - SQL injection patterns
  - Insecure crypto usage
  - Sensitive data in logs
- **DAST (Dynamic Application Security Testing):** OWASP ZAP automated scans against staging environment before each release
- **Secret detection:** `gitleaks` or `trufflehog` pre-commit hook to prevent secrets in source code
- **Security headers checked:** Automated tests verify all security headers (CSP, HSTS, X-Frame-Options) on every response
- **Penetration testing:** Annual third-party VAPT engagement; findings tracked to resolution

### 11.9 Logging & Monitoring (Security)

- **Structured logging (Pino):** All logs are JSON; no PII in logs (patient IDs only, never names/MRN)
- **Security event logging:**
  - Failed authentication attempts (with rate-limiting alerts)
  - RBAC access denials
  - Webhook signature failures
  - Cross-tenant access attempts
  - DSAR/erasure requests
  - Consent changes
- **Alerting:** Prometheus alerts for:
  - >10 failed auth attempts from same IP in 5 min
  - Webhook signature failure spike
  - Unusual data access patterns (e.g., coordinator accessing >100 patients in 1 hour)
- **Audit trail immutability:** `care_task_events` and `patient_stage_history` tables have no UPDATE/DELETE permissions for application role; append-only enforced at DB level

### 11.10 Security Modules in Backend

```
padma/backend/services/care-coordination/src/
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts           # JWT validation + tenant extraction
│   │   ├── rbac.guard.ts               # Role-based access control
│   │   ├── resource-owner.guard.ts     # IDOR prevention: verify resource belongs to user
│   │   └── webhook-signature.guard.ts  # HMAC verification for inbound webhooks
│   ├── interceptors/
│   │   ├── audit-log.interceptor.ts    # Log all data access with user context
│   │   ├── phi-redaction.interceptor.ts # Strip PHI from error responses/logs
│   │   └── tenant-scope.interceptor.ts # Inject tenant_id into Prisma context
│   ├── decorators/
│   │   ├── @Roles()                    # Declarative RBAC on controllers
│   │   ├── @RequireConsent()           # Check patient consent before action
│   │   └── @AuditAction()             # Mark actions for audit logging
│   ├── filters/
│   │   └── security-exception.filter.ts # Never leak stack traces or internal details
│   └── middleware/
│       ├── helmet.middleware.ts         # Security headers
│       ├── rate-limit.middleware.ts     # Per-user/per-tenant throttling
│       └── request-id.middleware.ts     # Correlation ID for distributed tracing
├── privacy/               # GDPR module
│   ├── privacy.controller.ts           # DSAR + erasure endpoints
│   ├── privacy.service.ts              # Data export + anonymization logic
│   ├── consent.service.ts              # Consent tracking + enforcement
│   └── retention.job.ts               # Scheduled data retention enforcement
```

---

## 12. Phased Implementation Roadmap

### Current Implementation Snapshot (April 2026)
- **Done:** Auth/RBAC foundation, tenant settings, pathway CRUD, visual pathway builder, stage/intervention/transition APIs, auto-generated pathway code, named care teams, care-team mapping to pathways, care-task template library, patient enrollment/start/transition, task queues, task status/assignment/completion, patient registry, single patient pathway monitor, care-team chat, communication templates, async communication delivery scheduler, privacy consent UI/APIs, dashboard summary APIs.
- **Partially done:** Transition evaluation and stage transition readiness exist, but automated event/webhook-driven clinical-data updates and coordinator transition proposals need hardening.
- **Not done / future:** Formal care-program/subscription models, tier entitlements, patient monitoring data tables, device/CGM ingestion, automated risk score history, full SSE real-time fan-out, Medha KPI export, Genesys call workflows, Salesforce logging depth, production-grade RLS/encryption policies.

### Phase 1: Foundation + Pathway Engine (Sprints 1-4, ~8 weeks)
- **Sprint 1:** Project bootstrap — NestJS setup, Prisma schemas, multi-tenancy, auth, Docker — **implemented**
- **Sprint 2:** Clinical Pathway CRUD — pathway, stages, intervention templates, transition rules, visual builder — **implemented**
- **Sprint 3:** Enrollment + Task Generation — patient enrollment, stage entry actions, task generator, task CRUD — **implemented**
- **Sprint 4:** Pathway Engine — transition evaluator, stage transition lifecycle, transition readiness — **partially implemented**

### Phase 2: Integrations + Automation (Sprints 5-7, ~6 weeks)
- **Sprint 5:** Athma Integration — webhook controller, auto-completion engine, clinical data updates from lab results, transition re-evaluation on clinical data change, template sync from Product Configurator — **partially implemented**
- **Sprint 6:** Reminders + Multi-Channel Comms — reminder scheduler, Athma trigger adapter, patient preferences/consent, async delivery — **partially implemented**
- **Sprint 7:** Real-Time + Coordinator Dashboard — dashboard APIs/frontends implemented; SSE still pending

### Phase 3: Intelligence (Sprints 8-10, ~6 weeks)
- **Sprint 8:** Escalation Engine — rules CRUD/scanner exists at foundation level; Genesys call integration pending
- **Sprint 9:** Patient Segmentation + Routing — pending
- **Sprint 10:** Internal care-team chat implemented; Med Echat proxy and Medha export pending

### Phase 4: Polish (Sprints 11-12, ~4 weeks)
- **Sprint 11:** Medication refill reminders, edge cases (plan pause/resume, timezone, concurrent enrollments), pathway versioning (handle patients on old versions)
- **Sprint 12:** Load testing, E2E integration testing with Athma staging, API docs, runbooks

**Total: ~12 sprints (~24 weeks)**

---

## 13. FR-to-Architecture Mapping

| FR | Module | Sprint | Notes |
|----|--------|--------|-------|
| FR-1 | pathways/ + enrollment/ | 2-3 | Pathway templates with stage-scoped interventions; Athma Product Configurator sync |
| FR-2 | tasks/ + pathway-engine/ + patient monitor | 3-4, 9 | Task generation from stages; FR-7, FR-8, FR-14 are subsets |
| FR-3 | reminders/ + communication/ | 6 | Reminder scheduler and async communication delivery |
| FR-4 | auto-completion/ + realtime/ | 7 | Auto-completion foundation; SSE pending |
| FR-5 | auto-completion/ + integrations/athma/ | 5 | Webhook → auto-complete → clinical data update → transition evaluation |
| FR-6 | dashboard/ | 7 | Coordinator dashboard with pathway stage distribution |
| FR-7 | tasks/ (patient-facing API) | 9 | Subset of FR-2 |
| FR-8 | tasks/ (self-serve completion) | 9 | Subset of FR-2 |
| FR-9 | communication/ | 6 | Consent-aware message persistence + background delivery; Athma sends, Salesforce logging pending/depth TBD |
| FR-10 | escalation/ | 8 | JSON DSL rules + chain execution |
| FR-11 | segments/ | 9 | JSON DSL filters, Athma+Medha data |
| FR-12 | care-chat/ + communication/ | 10 | Internal care-team chat implemented; Athma Med Echat proxy pending |
| FR-13 | dashboard/ + integrations/medha/ | 10 | Push metrics to Medha |
| FR-14 | pathways/ (configuration) | 2, 9 | Subset of FR-2 |
| FR-15 | integrations/ | 5-10 | Progressive integration across sprints |

---

## 14. Key Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Standalone vs. Zeal module | Standalone | Different domain model, independent deployment |
| Monolith vs. microservices | Monolith-first | Simpler to develop; extract later |
| Clinical Pathway model | Stateful workflow with decision nodes | User requirement; enables evidence-based, branching care protocols |
| Task generation scope | Per-stage, rolling 30-day window | Tasks tied to current stage; new stage = new tasks |
| Transition evaluation | JSON DSL condition evaluator | Same pattern as Zeal PRM rules; extensible, auditable |
| Message sending | Delegated to Athma | Avoid duplicate Twilio/SendGrid contracts |
| Message persistence | Persist first, deliver async | Third-party failures must not block validated message creation |
| Internal care chat | Separate `care-chat/` module, not patient outbound communication | Care team needs clinical collaboration and system updates independent from patient messaging |
| Care task templates | Tenant-level reusable library copied into stage-owned interventions | Reuse common tasks without coupling old pathways to future template edits |
| Patient monitor UX | Single patient page with selected pathway query param | Avoid confusing split between patient detail and pathway detail pages |
| Job queue | Postgres-backed (SKIP LOCKED) | Proven Zeal PRM pattern; transactional |
| Real-time | SSE (not WebSocket) | Unidirectional; simpler; native NestJS |
| Database | Unified Prisma schema currently; engagement models are separated by domain tables | Simpler local development; physical DB split can be revisited before production if needed |

---

## 15. Reference Files in Zeal (patterns to replicate)

- `zeal/backend/shared/database-prm/prisma/schema.prisma` — engagement model patterns
- `zeal/backend/services/prm/src/rules/rules-engine.service.ts` — JSON DSL evaluator (reuse for transitions, escalation, segments)
- `zeal/backend/services/prm/src/jobs/jobs-runner.service.ts` — Postgres job queue pattern
- `zeal/backend/services/prm/src/events/events.service.ts` — event ingestion pipeline
- `zeal/CLAUDE.md` — architecture conventions, multi-tenancy patterns

---

## 16. Verification Plan

1. **Unit tests:** Transition condition evaluator, task generator recurrence, escalation rule matching
2. **Integration tests:** Athma webhook → auto-complete → clinical data update → transition evaluation → stage change → new tasks generated
3. **E2E scenario:** Enroll diabetic patient → Assessment stage tasks generated → lab results arrive → HbA1c evaluated → auto-transition to Treatment → new tasks generated → reminders sent → adherence tracked
4. **Load test:** 10,000 concurrent enrollments per tenant
5. **Manual verification:** Use Claude Preview MCP tools to test pathway builder UI and coordinator dashboard
