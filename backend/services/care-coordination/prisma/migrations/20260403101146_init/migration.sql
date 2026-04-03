/*
  Warnings:

  - You are about to drop the `care_task_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `care_tasks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clinical_pathways` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `escalation_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `padma_jobs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pathway_stages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_pathway_enrollments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_segments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patient_stage_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stage_intervention_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stage_transition_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `webhook_events` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "care_task_events" DROP CONSTRAINT "care_task_events_task_id_fkey";

-- DropForeignKey
ALTER TABLE "care_tasks" DROP CONSTRAINT "care_tasks_enrollment_id_fkey";

-- DropForeignKey
ALTER TABLE "care_tasks" DROP CONSTRAINT "care_tasks_intervention_template_id_fkey";

-- DropForeignKey
ALTER TABLE "pathway_stages" DROP CONSTRAINT "pathway_stages_pathway_id_fkey";

-- DropForeignKey
ALTER TABLE "patient_pathway_enrollments" DROP CONSTRAINT "patient_pathway_enrollments_current_stage_id_fkey";

-- DropForeignKey
ALTER TABLE "patient_pathway_enrollments" DROP CONSTRAINT "patient_pathway_enrollments_pathway_id_fkey";

-- DropForeignKey
ALTER TABLE "patient_stage_history" DROP CONSTRAINT "patient_stage_history_enrollment_id_fkey";

-- DropForeignKey
ALTER TABLE "patient_stage_history" DROP CONSTRAINT "patient_stage_history_from_stage_id_fkey";

-- DropForeignKey
ALTER TABLE "patient_stage_history" DROP CONSTRAINT "patient_stage_history_to_stage_id_fkey";

-- DropForeignKey
ALTER TABLE "patient_stage_history" DROP CONSTRAINT "patient_stage_history_transition_rule_id_fkey";

-- DropForeignKey
ALTER TABLE "stage_intervention_templates" DROP CONSTRAINT "stage_intervention_templates_stage_id_fkey";

-- DropForeignKey
ALTER TABLE "stage_transition_rules" DROP CONSTRAINT "stage_transition_rules_from_stage_id_fkey";

-- DropForeignKey
ALTER TABLE "stage_transition_rules" DROP CONSTRAINT "stage_transition_rules_pathway_id_fkey";

-- DropForeignKey
ALTER TABLE "stage_transition_rules" DROP CONSTRAINT "stage_transition_rules_to_stage_id_fkey";

-- DropTable
DROP TABLE "care_task_events";

-- DropTable
DROP TABLE "care_tasks";

-- DropTable
DROP TABLE "clinical_pathways";

-- DropTable
DROP TABLE "escalation_rules";

-- DropTable
DROP TABLE "padma_jobs";

-- DropTable
DROP TABLE "pathway_stages";

-- DropTable
DROP TABLE "patient_pathway_enrollments";

-- DropTable
DROP TABLE "patient_segments";

-- DropTable
DROP TABLE "patient_stage_history";

-- DropTable
DROP TABLE "stage_intervention_templates";

-- DropTable
DROP TABLE "stage_transition_rules";

-- DropTable
DROP TABLE "webhook_events";

-- CreateTable
CREATE TABLE "communication_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "subject" VARCHAR(500),
    "body_template" TEXT NOT NULL,
    "variables" JSONB,
    "category" VARCHAR(30) NOT NULL DEFAULT 'reminder',
    "version" SMALLINT NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_preferences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "preferred_language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "channel_preference" JSONB NOT NULL DEFAULT '["whatsapp", "sms", "email"]',
    "quiet_hours_start" VARCHAR(5),
    "quiet_hours_end" VARCHAR(5),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Dubai',
    "do_not_disturb" BOOLEAN NOT NULL DEFAULT false,
    "opt_out_sms" BOOLEAN NOT NULL DEFAULT false,
    "opt_out_email" BOOLEAN NOT NULL DEFAULT false,
    "opt_out_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "opt_out_call" BOOLEAN NOT NULL DEFAULT false,
    "guardian_name" VARCHAR(255),
    "guardian_phone" VARCHAR(20),
    "guardian_relation" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patient_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "direction" VARCHAR(10) NOT NULL DEFAULT 'outbound',
    "template_code" VARCHAR(100),
    "subject" VARCHAR(500),
    "body" TEXT NOT NULL,
    "purpose" VARCHAR(30) NOT NULL DEFAULT 'reminder',
    "related_entity_type" VARCHAR(30),
    "related_entity_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "provider_name" VARCHAR(30),
    "provider_ref" VARCHAR(255),
    "provider_response" JSONB,
    "failure_reason" TEXT,
    "retry_count" SMALLINT NOT NULL DEFAULT 0,
    "idempotency_key" VARCHAR(255),
    "sent_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "consent_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'granted',
    "granted_at" TIMESTAMPTZ(6) NOT NULL,
    "withdrawn_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "consent_version" VARCHAR(20),
    "collection_method" VARCHAR(20) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_callbacks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_name" VARCHAR(30) NOT NULL,
    "provider_ref" VARCHAR(255) NOT NULL,
    "callback_type" VARCHAR(30) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "provider_callbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "communication_templates_tenant_id_category_channel_status_idx" ON "communication_templates"("tenant_id", "category", "channel", "status");

-- CreateIndex
CREATE UNIQUE INDEX "communication_templates_tenant_id_code_channel_language_ver_key" ON "communication_templates"("tenant_id", "code", "channel", "language", "version");

-- CreateIndex
CREATE UNIQUE INDEX "patient_preferences_tenant_id_patient_id_key" ON "patient_preferences"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "patient_messages_tenant_id_patient_id_created_at_idx" ON "patient_messages"("tenant_id", "patient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "patient_messages_tenant_id_status_channel_idx" ON "patient_messages"("tenant_id", "status", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "patient_messages_tenant_id_idempotency_key_key" ON "patient_messages"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "patient_consents_tenant_id_patient_id_consent_type_status_idx" ON "patient_consents"("tenant_id", "patient_id", "consent_type", "status");

-- CreateIndex
CREATE INDEX "provider_callbacks_tenant_id_provider_ref_idx" ON "provider_callbacks"("tenant_id", "provider_ref");

-- CreateIndex
CREATE INDEX "provider_callbacks_tenant_id_processed_idx" ON "provider_callbacks"("tenant_id", "processed");
