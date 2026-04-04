/*
  Warnings:

  - You are about to drop the `communication_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_consents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_preferences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `provider_callbacks` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "tenant_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_INVITE', 'DEACTIVATED');

-- DropTable
DROP TABLE "communication_templates";

-- DropTable
DROP TABLE "patient_consents";

-- DropTable
DROP TABLE "patient_messages";

-- DropTable
DROP TABLE "patient_preferences";

-- DropTable
DROP TABLE "provider_callbacks";

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255),
    "status" "tenant_status" NOT NULL DEFAULT 'ACTIVE',
    "country" VARCHAR(2) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Dubai',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "plan_tier" VARCHAR(30) NOT NULL DEFAULT 'standard',
    "max_users" INTEGER NOT NULL DEFAULT 50,
    "trial_ends_at" TIMESTAMPTZ(6),
    "oidc_issuer" VARCHAR(500),
    "oidc_client_id" VARCHAR(255),
    "oidc_audience" VARCHAR(255),
    "contact_email" VARCHAR(255),
    "feature_flags" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "oidc_sub" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "display_name" VARCHAR(255),
    "avatar_url" VARCHAR(500),
    "phone_number" VARCHAR(30),
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Dubai',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "last_login_at" TIMESTAMPTZ(6),
    "last_login_ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tenant_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "facility_id" UUID,
    "facility_name" VARCHAR(255),
    "granted_by" UUID,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_tenant_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_pathways" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "applicable_settings" JSONB NOT NULL DEFAULT '[]',
    "version" SMALLINT NOT NULL DEFAULT 1,
    "default_duration_days" INTEGER NOT NULL,
    "external_source_system" VARCHAR(50),
    "external_source_id" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "clinical_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pathway_stages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pathway_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "stage_type" VARCHAR(20) NOT NULL,
    "care_setting" VARCHAR(20) NOT NULL DEFAULT 'any',
    "sort_order" SMALLINT NOT NULL,
    "expected_duration_days" INTEGER,
    "min_duration_days" INTEGER,
    "auto_transition" BOOLEAN NOT NULL DEFAULT false,
    "entry_actions" JSONB,
    "exit_actions" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pathway_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_intervention_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "intervention_type" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "care_setting" VARCHAR(20) NOT NULL DEFAULT 'any',
    "delivery_mode" VARCHAR(30) NOT NULL DEFAULT 'in_person',
    "frequency_type" VARCHAR(20) NOT NULL,
    "frequency_value" INTEGER,
    "start_day_offset" INTEGER NOT NULL DEFAULT 0,
    "end_day_offset" INTEGER,
    "default_owner_role" VARCHAR(50),
    "auto_complete_source" VARCHAR(30),
    "auto_complete_event_type" VARCHAR(100),
    "priority" SMALLINT NOT NULL DEFAULT 2,
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "reminder_config" JSONB,
    "metadata" JSONB,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stage_intervention_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_transition_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pathway_id" UUID NOT NULL,
    "from_stage_id" UUID NOT NULL,
    "to_stage_id" UUID NOT NULL,
    "rule_name" VARCHAR(255) NOT NULL,
    "rule_description" TEXT,
    "trigger_type" VARCHAR(20) NOT NULL,
    "condition_expr" JSONB NOT NULL,
    "priority" SMALLINT NOT NULL DEFAULT 100,
    "is_automatic" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "transition_actions" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stage_transition_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_pathway_enrollments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "patient_display_name" VARCHAR(255),
    "patient_mrn" VARCHAR(50),
    "patient_gender" VARCHAR(1),
    "patient_dob" DATE,
    "pathway_id" UUID NOT NULL,
    "pathway_version" SMALLINT NOT NULL,
    "plan_name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "enrollment_date" DATE NOT NULL,
    "start_date" DATE NOT NULL,
    "expected_end_date" DATE NOT NULL,
    "actual_end_date" DATE,
    "current_stage_id" UUID NOT NULL,
    "current_stage_entered_at" TIMESTAMPTZ(6) NOT NULL,
    "current_care_setting" VARCHAR(20) NOT NULL DEFAULT 'outpatient',
    "previous_stage_id" UUID,
    "primary_coordinator_id" UUID,
    "care_team" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "status_reason" TEXT,
    "total_tasks" INTEGER NOT NULL DEFAULT 0,
    "completed_tasks" INTEGER NOT NULL DEFAULT 0,
    "overdue_tasks" INTEGER NOT NULL DEFAULT 0,
    "adherence_percent" DECIMAL(5,2),
    "athma_patient_id" VARCHAR(255),
    "athma_product_id" VARCHAR(255),
    "clinical_data" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "patient_pathway_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_stage_history" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "from_stage_id" UUID,
    "from_stage_name" VARCHAR(255),
    "to_stage_id" UUID NOT NULL,
    "to_stage_name" VARCHAR(255) NOT NULL,
    "transition_rule_id" UUID,
    "transition_type" VARCHAR(30) NOT NULL,
    "reason" TEXT,
    "clinical_data_snapshot" JSONB,
    "performed_by" UUID,
    "transitioned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_tasks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "patient_display_name" VARCHAR(255),
    "patient_mrn" VARCHAR(50),
    "intervention_template_id" UUID,
    "intervention_type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "care_setting" VARCHAR(20) NOT NULL DEFAULT 'outpatient',
    "delivery_mode" VARCHAR(30) NOT NULL DEFAULT 'in_person',
    "due_date" DATE NOT NULL,
    "due_time" VARCHAR(5),
    "window_start_date" DATE,
    "window_end_date" DATE,
    "occurrence_number" INTEGER NOT NULL DEFAULT 1,
    "total_occurrences" INTEGER,
    "assigned_to_user_id" UUID,
    "assigned_to_role" VARCHAR(50),
    "priority" SMALLINT NOT NULL DEFAULT 2,
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "completion_method" VARCHAR(30),
    "completion_notes" TEXT,
    "completion_evidence" JSONB,
    "auto_complete_source" VARCHAR(30),
    "auto_complete_event_type" VARCHAR(100),
    "escalation_level" SMALLINT NOT NULL DEFAULT 0,
    "last_escalated_at" TIMESTAMPTZ(6),
    "last_reminder_sent_at" TIMESTAMPTZ(6),
    "reminder_count" SMALLINT NOT NULL DEFAULT 0,
    "next_reminder_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "care_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_task_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "event_type" VARCHAR(30) NOT NULL,
    "from_status" VARCHAR(20),
    "to_status" VARCHAR(20),
    "payload" JSONB,
    "performed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_task_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalation_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "trigger_type" VARCHAR(40) NOT NULL,
    "condition_expr" JSONB NOT NULL,
    "escalation_chain" JSONB NOT NULL,
    "priority" SMALLINT NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "escalation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_segments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "filter_expr" JSONB NOT NULL,
    "cached_count" INTEGER,
    "last_refreshed_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patient_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "padma_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "job_type" VARCHAR(40) NOT NULL,
    "patient_id" UUID,
    "enrollment_id" UUID,
    "task_id" UUID,
    "payload" JSONB NOT NULL,
    "run_at" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'READY',
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "max_attempts" SMALLINT NOT NULL DEFAULT 3,
    "locked_at" TIMESTAMPTZ(6),
    "locked_by" VARCHAR(100),
    "last_error" TEXT,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "padma_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" VARCHAR(30) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" VARCHAR(255),
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE INDEX "roles_is_system_is_active_idx" ON "roles"("is_system", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_code_key" ON "roles"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "users_oidc_sub_key" ON "users"("oidc_sub");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "user_tenant_roles_tenant_id_role_id_is_active_idx" ON "user_tenant_roles"("tenant_id", "role_id", "is_active");

-- CreateIndex
CREATE INDEX "user_tenant_roles_user_id_is_active_idx" ON "user_tenant_roles"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenant_roles_user_id_tenant_id_key" ON "user_tenant_roles"("user_id", "tenant_id");

-- CreateIndex
CREATE INDEX "clinical_pathways_tenant_id_category_is_active_idx" ON "clinical_pathways"("tenant_id", "category", "is_active");

-- CreateIndex
CREATE INDEX "clinical_pathways_tenant_id_status_idx" ON "clinical_pathways"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_pathways_tenant_id_code_version_key" ON "clinical_pathways"("tenant_id", "code", "version");

-- CreateIndex
CREATE INDEX "pathway_stages_tenant_id_pathway_id_sort_order_idx" ON "pathway_stages"("tenant_id", "pathway_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "pathway_stages_tenant_id_pathway_id_code_key" ON "pathway_stages"("tenant_id", "pathway_id", "code");

-- CreateIndex
CREATE INDEX "stage_intervention_templates_tenant_id_stage_id_sort_order_idx" ON "stage_intervention_templates"("tenant_id", "stage_id", "sort_order");

-- CreateIndex
CREATE INDEX "stage_transition_rules_tenant_id_from_stage_id_is_active_pr_idx" ON "stage_transition_rules"("tenant_id", "from_stage_id", "is_active", "priority");

-- CreateIndex
CREATE INDEX "patient_pathway_enrollments_tenant_id_patient_id_status_idx" ON "patient_pathway_enrollments"("tenant_id", "patient_id", "status");

-- CreateIndex
CREATE INDEX "patient_pathway_enrollments_tenant_id_current_stage_id_stat_idx" ON "patient_pathway_enrollments"("tenant_id", "current_stage_id", "status");

-- CreateIndex
CREATE INDEX "patient_pathway_enrollments_tenant_id_primary_coordinator_i_idx" ON "patient_pathway_enrollments"("tenant_id", "primary_coordinator_id", "status");

-- CreateIndex
CREATE INDEX "patient_pathway_enrollments_tenant_id_status_adherence_perc_idx" ON "patient_pathway_enrollments"("tenant_id", "status", "adherence_percent");

-- CreateIndex
CREATE INDEX "patient_pathway_enrollments_tenant_id_category_status_idx" ON "patient_pathway_enrollments"("tenant_id", "category", "status");

-- CreateIndex
CREATE INDEX "patient_stage_history_tenant_id_enrollment_id_transitioned__idx" ON "patient_stage_history"("tenant_id", "enrollment_id", "transitioned_at" DESC);

-- CreateIndex
CREATE INDEX "care_tasks_tenant_id_patient_id_status_due_date_idx" ON "care_tasks"("tenant_id", "patient_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "care_tasks_tenant_id_enrollment_id_stage_id_status_idx" ON "care_tasks"("tenant_id", "enrollment_id", "stage_id", "status");

-- CreateIndex
CREATE INDEX "care_tasks_tenant_id_assigned_to_user_id_status_due_date_idx" ON "care_tasks"("tenant_id", "assigned_to_user_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "idx_tasks_overdue_scan" ON "care_tasks"("tenant_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "idx_tasks_autocompletion" ON "care_tasks"("tenant_id", "auto_complete_event_type", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_reminder_scan" ON "care_tasks"("tenant_id", "next_reminder_at", "status");

-- CreateIndex
CREATE INDEX "care_task_events_tenant_id_task_id_created_at_idx" ON "care_task_events"("tenant_id", "task_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "escalation_rules_tenant_id_is_active_trigger_type_idx" ON "escalation_rules"("tenant_id", "is_active", "trigger_type");

-- CreateIndex
CREATE UNIQUE INDEX "escalation_rules_tenant_id_name_key" ON "escalation_rules"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "patient_segments_tenant_id_name_key" ON "patient_segments"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "idx_padma_jobs_ready" ON "padma_jobs"("tenant_id", "status", "run_at");

-- CreateIndex
CREATE UNIQUE INDEX "padma_jobs_tenant_id_idempotency_key_key" ON "padma_jobs"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "webhook_events_tenant_id_source_received_at_idx" ON "webhook_events"("tenant_id", "source", "received_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_events_tenant_id_processed_source_idx" ON "webhook_events"("tenant_id", "processed", "source");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathway_stages" ADD CONSTRAINT "pathway_stages_pathway_id_fkey" FOREIGN KEY ("pathway_id") REFERENCES "clinical_pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_intervention_templates" ADD CONSTRAINT "stage_intervention_templates_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pathway_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transition_rules" ADD CONSTRAINT "stage_transition_rules_pathway_id_fkey" FOREIGN KEY ("pathway_id") REFERENCES "clinical_pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transition_rules" ADD CONSTRAINT "stage_transition_rules_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "pathway_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transition_rules" ADD CONSTRAINT "stage_transition_rules_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "pathway_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_pathway_enrollments" ADD CONSTRAINT "patient_pathway_enrollments_pathway_id_fkey" FOREIGN KEY ("pathway_id") REFERENCES "clinical_pathways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_pathway_enrollments" ADD CONSTRAINT "patient_pathway_enrollments_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "pathway_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_stage_history" ADD CONSTRAINT "patient_stage_history_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "patient_pathway_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_stage_history" ADD CONSTRAINT "patient_stage_history_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "pathway_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_stage_history" ADD CONSTRAINT "patient_stage_history_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "pathway_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_stage_history" ADD CONSTRAINT "patient_stage_history_transition_rule_id_fkey" FOREIGN KEY ("transition_rule_id") REFERENCES "stage_transition_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_tasks" ADD CONSTRAINT "care_tasks_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "patient_pathway_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_tasks" ADD CONSTRAINT "care_tasks_intervention_template_id_fkey" FOREIGN KEY ("intervention_template_id") REFERENCES "stage_intervention_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_task_events" ADD CONSTRAINT "care_task_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "care_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
