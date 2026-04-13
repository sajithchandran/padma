-- CreateEnum
CREATE TYPE "observation_source" AS ENUM (
    'HIS',
    'CLINICIAN',
    'CARE_COORDINATOR',
    'PATIENT',
    'DEVICE',
    'API',
    'IMPORT',
    'DERIVED'
);

-- CreateTable
CREATE TABLE "observation_item_master" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "data_type" VARCHAR(30) NOT NULL,
    "unit" VARCHAR(50),
    "allowed_values" JSONB,
    "normal_range_min" DECIMAL(18,6),
    "normal_range_max" DECIMAL(18,6),
    "critical_low" DECIMAL(18,6),
    "critical_high" DECIMAL(18,6),
    "precision_scale" SMALLINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "observation_item_master_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "observation_item_master_precision_scale_check" CHECK ("precision_scale" IS NULL OR "precision_scale" >= 0),
    CONSTRAINT "observation_item_master_display_order_check" CHECK ("display_order" >= 0),
    CONSTRAINT "observation_item_master_normal_range_check" CHECK (
        "normal_range_min" IS NULL
        OR "normal_range_max" IS NULL
        OR "normal_range_min" <= "normal_range_max"
    ),
    CONSTRAINT "observation_item_master_critical_range_check" CHECK (
        "critical_low" IS NULL
        OR "critical_high" IS NULL
        OR "critical_low" <= "critical_high"
    )
);

-- CreateTable
CREATE TABLE "patient_observation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "observed_at" TIMESTAMPTZ(6) NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "observation_source" NOT NULL,
    "source_system" VARCHAR(50),
    "source_reference_id" VARCHAR(255),
    "value_numeric" DECIMAL(18,6),
    "value_text" TEXT,
    "value_boolean" BOOLEAN,
    "value_coded" VARCHAR(100),
    "value_json" JSONB,
    "value_date" DATE,
    "value_date_time" TIMESTAMPTZ(6),
    "unit" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'final',
    "is_abnormal" BOOLEAN,
    "is_critical" BOOLEAN,
    "entered_by_user_id" UUID,
    "entered_by_role" VARCHAR(50),
    "device_id" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patient_observation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patient_observation_exactly_one_value_check" CHECK (
        num_nonnulls(
            "value_numeric",
            "value_text",
            "value_boolean",
            "value_coded",
            "value_json",
            "value_date",
            "value_date_time"
        ) = 1
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "observation_item_master_tenant_id_code_key" ON "observation_item_master"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "observation_item_master_tenant_id_is_active_category_display_order_idx" ON "observation_item_master"("tenant_id", "is_active", "category", "display_order");

-- CreateIndex
CREATE INDEX "observation_item_master_tenant_id_category_data_type_idx" ON "observation_item_master"("tenant_id", "category", "data_type");

-- CreateIndex
CREATE INDEX "patient_observation_tenant_id_patient_id_idx" ON "patient_observation"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "patient_observation_tenant_id_patient_id_item_id_observed_at_idx" ON "patient_observation"("tenant_id", "patient_id", "item_id", "observed_at" DESC);

-- CreateIndex
CREATE INDEX "patient_observation_tenant_id_item_id_idx" ON "patient_observation"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "patient_observation_tenant_id_source_idx" ON "patient_observation"("tenant_id", "source");

-- CreateIndex
CREATE INDEX "patient_observation_tenant_id_source_system_source_reference_id_idx" ON "patient_observation"("tenant_id", "source_system", "source_reference_id");

-- AddForeignKey
ALTER TABLE "observation_item_master"
ADD CONSTRAINT "observation_item_master_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_observation"
ADD CONSTRAINT "patient_observation_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_observation"
ADD CONSTRAINT "patient_observation_item_id_fkey"
FOREIGN KEY ("item_id") REFERENCES "observation_item_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_observation"
ADD CONSTRAINT "patient_observation_entered_by_user_id_fkey"
FOREIGN KEY ("entered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
