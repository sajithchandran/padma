import type { Prisma, PrismaClient } from '../../node_modules/.prisma/client';

type InterventionSeed = {
  stageCode: string;
  name: string;
  interventionType: string;
  description: string;
  careSetting?: string;
  deliveryMode?: string;
  frequencyType?: string;
  frequencyValue?: number;
  startDayOffset?: number;
  endDayOffset?: number;
  defaultOwnerRole?: string;
  autoCompleteSource?: string;
  autoCompleteEventType?: string;
  priority?: number;
  isCritical?: boolean;
  reminderConfig?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

const PATHWAY_INTERVENTIONS: Record<string, InterventionSeed[]> = {
  'DM-MGMT-001': [
    {
      stageCode: 'INITIAL-ASSESSMENT',
      name: 'Baseline HbA1c Test',
      interventionType: 'lab_test',
      description: 'Order and review baseline HbA1c for glycemic control assessment.',
      defaultOwnerRole: 'care_coordinator',
      autoCompleteSource: 'athma_lab',
      autoCompleteEventType: 'lab_result.available',
      priority: 4,
      isCritical: true,
      metadata: { observationCode: 'HBA1C' },
    },
    {
      stageCode: 'INITIAL-ASSESSMENT',
      name: 'Baseline Renal and Lipid Panel',
      interventionType: 'lab_test',
      description: 'Capture creatinine, eGFR, urine microalbumin, LDL, HDL, and triglycerides.',
      defaultOwnerRole: 'care_coordinator',
      priority: 3,
      metadata: { observationCodes: ['CREATININE', 'EGFR', 'URINE_MICROALBUMIN', 'LDL', 'HDL', 'TRIGLYCERIDES'] },
    },
    {
      stageCode: 'INITIAL-ASSESSMENT',
      name: 'Initial Physician Diabetes Review',
      interventionType: 'consultation',
      description: 'Physician consultation to confirm diagnosis, set targets, and review medications.',
      defaultOwnerRole: 'physician',
      priority: 4,
      isCritical: true,
    },
    {
      stageCode: 'STABILISATION',
      name: 'Dietician Counselling Session',
      interventionType: 'education',
      description: 'Personalized diet counselling and lifestyle goal setting.',
      defaultOwnerRole: 'care_coordinator',
      deliveryMode: 'telehealth',
      startDayOffset: 7,
      endDayOffset: 21,
      priority: 2,
    },
    {
      stageCode: 'STABILISATION',
      name: 'Weekly Glucose Follow-up',
      interventionType: 'follow_up',
      description: 'Weekly follow-up to review glucose logs, adherence, and hypoglycemia episodes.',
      defaultOwnerRole: 'care_coordinator',
      deliveryMode: 'telehealth',
      frequencyType: 'weekly',
      frequencyValue: 1,
      startDayOffset: 7,
      endDayOffset: 56,
      priority: 3,
      metadata: { observationCodes: ['FASTING_GLUCOSE', 'POSTPRANDIAL_GLUCOSE', 'HYPOGLYCEMIA_EPISODE'] },
    },
    {
      stageCode: 'MAINTENANCE',
      name: 'Quarterly HbA1c Review',
      interventionType: 'lab_test',
      description: 'Quarterly HbA1c test and trend review.',
      defaultOwnerRole: 'care_coordinator',
      frequencyType: 'monthly',
      frequencyValue: 3,
      startDayOffset: 0,
      endDayOffset: 240,
      priority: 3,
      metadata: { observationCode: 'HBA1C' },
    },
    {
      stageCode: 'MAINTENANCE',
      name: 'Annual Foot and Eye Screening',
      interventionType: 'screening',
      description: 'Coordinate foot neuropathy and retinal screening status.',
      defaultOwnerRole: 'care_coordinator',
      priority: 3,
      metadata: { observationCodes: ['FOOT_EXAM_STATUS', 'EYE_EXAM_STATUS'] },
    },
    {
      stageCode: 'GRADUATION',
      name: 'Program Outcome Review',
      interventionType: 'assessment',
      description: 'Review HbA1c trend, adherence, complications, and continuation plan.',
      defaultOwnerRole: 'physician',
      priority: 3,
    },
  ],
  'HTN-CTRL-001': [
    {
      stageCode: 'INITIAL-ASSESSMENT',
      name: 'Baseline Blood Pressure Assessment',
      interventionType: 'assessment',
      description: 'Record systolic and diastolic BP, weight, BMI, and cardiac risk factors.',
      defaultOwnerRole: 'nurse',
      priority: 4,
      isCritical: true,
      metadata: { observationCodes: ['SYSTOLIC_BP', 'DIASTOLIC_BP', 'WEIGHT', 'BMI'] },
    },
    {
      stageCode: 'INITIAL-ASSESSMENT',
      name: 'Physician Hypertension Review',
      interventionType: 'consultation',
      description: 'Physician review for treatment plan, medication reconciliation, and target BP.',
      defaultOwnerRole: 'physician',
      priority: 4,
      isCritical: true,
    },
    {
      stageCode: 'TITRATION',
      name: 'Weekly BP Titration Follow-up',
      interventionType: 'follow_up',
      description: 'Weekly review of BP readings and medication side effects during titration.',
      defaultOwnerRole: 'care_coordinator',
      deliveryMode: 'telehealth',
      frequencyType: 'weekly',
      frequencyValue: 1,
      startDayOffset: 7,
      endDayOffset: 56,
      priority: 3,
      metadata: { observationCodes: ['SYSTOLIC_BP', 'DIASTOLIC_BP'] },
    },
    {
      stageCode: 'MONITORING',
      name: 'Monthly BP Monitoring',
      interventionType: 'monitoring',
      description: 'Monthly stable BP monitoring and adherence check.',
      defaultOwnerRole: 'care_coordinator',
      deliveryMode: 'telehealth',
      frequencyType: 'monthly',
      frequencyValue: 1,
      startDayOffset: 0,
      endDayOffset: 90,
      priority: 2,
    },
    {
      stageCode: 'DISCHARGE',
      name: 'Discharge Readiness Review',
      interventionType: 'assessment',
      description: 'Confirm stable BP control, adherence, and long-term follow-up plan.',
      defaultOwnerRole: 'physician',
      priority: 3,
    },
  ],
  'CARD-REHAB-001': [
    {
      stageCode: 'ACUTE-RECOVERY',
      name: 'Post-discharge Cardiac Assessment',
      interventionType: 'assessment',
      description: 'Assess vitals, symptoms, medication adherence, and rehab readiness after discharge.',
      defaultOwnerRole: 'nurse',
      priority: 4,
      isCritical: true,
      metadata: { observationCodes: ['SYSTOLIC_BP', 'DIASTOLIC_BP', 'HEART_RATE', 'SPO2'] },
    },
    {
      stageCode: 'ACUTE-RECOVERY',
      name: 'Cardiologist Review',
      interventionType: 'consultation',
      description: 'Specialist review of cardiac risk, medication plan, and rehab clearance.',
      defaultOwnerRole: 'physician',
      priority: 4,
      isCritical: true,
    },
    {
      stageCode: 'ACTIVE-REHAB',
      name: 'Supervised Rehab Session',
      interventionType: 'therapy',
      description: 'Structured cardiac rehabilitation session with exercise tolerance monitoring.',
      defaultOwnerRole: 'nurse',
      frequencyType: 'weekly',
      frequencyValue: 2,
      startDayOffset: 7,
      endDayOffset: 60,
      priority: 3,
    },
    {
      stageCode: 'ACTIVE-REHAB',
      name: 'Medication and Lifestyle Counselling',
      interventionType: 'education',
      description: 'Counselling on medication adherence, diet, activity, smoking, and red flags.',
      defaultOwnerRole: 'care_coordinator',
      deliveryMode: 'telehealth',
      startDayOffset: 7,
      endDayOffset: 21,
      priority: 2,
    },
    {
      stageCode: 'MAINTENANCE',
      name: 'Maintenance Outcome Review',
      interventionType: 'assessment',
      description: 'Review functional progress, symptoms, vitals, and ongoing maintenance plan.',
      defaultOwnerRole: 'physician',
      priority: 3,
    },
  ],
  'COPD-MGMT-001': [
    {
      stageCode: 'INITIAL-ASSESSMENT',
      name: 'Baseline COPD Assessment',
      interventionType: 'assessment',
      description: 'Capture symptoms, oxygen saturation, inhaler use, smoking status, and exacerbation history.',
      defaultOwnerRole: 'nurse',
      priority: 4,
      isCritical: true,
      metadata: { observationCodes: ['SPO2', 'HEART_RATE'] },
    },
    {
      stageCode: 'INITIAL-ASSESSMENT',
      name: 'Pulmonology Review',
      interventionType: 'consultation',
      description: 'Physician review for COPD severity, medication plan, and escalation thresholds.',
      defaultOwnerRole: 'physician',
      priority: 4,
      isCritical: true,
    },
    {
      stageCode: 'EXACERBATION-MGMT',
      name: 'Exacerbation Follow-up Call',
      interventionType: 'follow_up',
      description: 'Follow-up to assess breathlessness, rescue medication use, SpO2, and urgent referral need.',
      defaultOwnerRole: 'care_coordinator',
      deliveryMode: 'telehealth',
      frequencyType: 'weekly',
      frequencyValue: 1,
      startDayOffset: 0,
      endDayOffset: 28,
      priority: 4,
      isCritical: true,
    },
    {
      stageCode: 'STABLE-MONITORING',
      name: 'Monthly Respiratory Monitoring',
      interventionType: 'monitoring',
      description: 'Monthly COPD monitoring and inhaler adherence review.',
      defaultOwnerRole: 'care_coordinator',
      deliveryMode: 'telehealth',
      frequencyType: 'monthly',
      frequencyValue: 1,
      startDayOffset: 0,
      endDayOffset: 120,
      priority: 2,
    },
    {
      stageCode: 'LONG-TERM-CARE',
      name: 'Long-term COPD Care Plan Review',
      interventionType: 'assessment',
      description: 'Confirm maintenance plan, vaccination counselling, and escalation instructions.',
      defaultOwnerRole: 'physician',
      priority: 3,
    },
  ],
  'OBESITY-MGMT-001': [
    {
      stageCode: 'LIFESTYLE-BASELINE',
      name: 'Baseline Lifestyle and Anthropometry Assessment',
      interventionType: 'assessment',
      description: 'Capture weight, height, BMI, lifestyle history, diet pattern, and readiness to change.',
      defaultOwnerRole: 'care_coordinator',
      priority: 4,
      isCritical: true,
      metadata: { observationCodes: ['WEIGHT', 'HEIGHT', 'BMI'] },
    },
    {
      stageCode: 'LIFESTYLE-BASELINE',
      name: 'Physician Obesity Review',
      interventionType: 'consultation',
      description: 'Clinical review for obesity-related risks, medications, and program suitability.',
      defaultOwnerRole: 'physician',
      priority: 3,
    },
    {
      stageCode: 'ACTIVE-INTERVENTION',
      name: 'Diet and Exercise Coaching',
      interventionType: 'education',
      description: 'Structured coaching for nutrition, calorie targets, physical activity, and behavior change.',
      defaultOwnerRole: 'care_coordinator',
      deliveryMode: 'telehealth',
      frequencyType: 'weekly',
      frequencyValue: 1,
      startDayOffset: 7,
      endDayOffset: 84,
      priority: 3,
    },
    {
      stageCode: 'ACTIVE-INTERVENTION',
      name: 'Monthly Weight and BMI Review',
      interventionType: 'monitoring',
      description: 'Monthly weight/BMI trend review and plan adjustment.',
      defaultOwnerRole: 'care_coordinator',
      deliveryMode: 'telehealth',
      frequencyType: 'monthly',
      frequencyValue: 1,
      startDayOffset: 30,
      endDayOffset: 180,
      priority: 2,
      metadata: { observationCodes: ['WEIGHT', 'BMI', 'ADHERENCE_SCORE'] },
    },
    {
      stageCode: 'SUSTAINED-CHANGE',
      name: 'Sustained Change Outcome Review',
      interventionType: 'assessment',
      description: 'Review weight trend, adherence score, barriers, and long-term maintenance plan.',
      defaultOwnerRole: 'physician',
      priority: 3,
    },
  ],
};

export async function seedPathwayInterventions(prisma: PrismaClient, tenantId: string) {
  const pathwayCodes = Object.keys(PATHWAY_INTERVENTIONS);
  console.log(`   Upserting intervention templates for ${pathwayCodes.length} pathway codes...`);

  const pathways = await prisma.clinicalPathway.findMany({
    where: { tenantId, code: { in: pathwayCodes }, isActive: true },
    include: { stages: true },
    orderBy: [{ code: 'asc' }, { version: 'asc' }],
  });

  for (const pathway of pathways) {
    const stageByCode = new Map(pathway.stages.map((stage) => [stage.code, stage]));
    const seeds = PATHWAY_INTERVENTIONS[pathway.code] ?? [];

    for (const [index, seed] of seeds.entries()) {
      const stage = stageByCode.get(seed.stageCode);
      if (!stage) {
        console.warn(`      Skipping ${pathway.code} v${pathway.version}: missing stage ${seed.stageCode}`);
        continue;
      }

      const data = {
        tenantId,
        stageId: stage.id,
        interventionType: seed.interventionType,
        name: seed.name,
        description: seed.description,
        careSetting: seed.careSetting ?? stage.careSetting ?? 'any',
        deliveryMode: seed.deliveryMode ?? 'in_person',
        frequencyType: seed.frequencyType ?? 'once',
        frequencyValue: seed.frequencyValue,
        startDayOffset: seed.startDayOffset ?? 0,
        endDayOffset: seed.endDayOffset,
        defaultOwnerRole: seed.defaultOwnerRole,
        autoCompleteSource: seed.autoCompleteSource,
        autoCompleteEventType: seed.autoCompleteEventType,
        priority: seed.priority ?? 2,
        isCritical: seed.isCritical ?? false,
        reminderConfig: (seed.reminderConfig ?? { beforeDueDays: [1, 0] }) as Prisma.InputJsonValue,
        metadata: seed.metadata as Prisma.InputJsonValue | undefined,
        sortOrder: index + 1,
      };

      const existing = await prisma.stageInterventionTemplate.findFirst({
        where: { tenantId, stageId: stage.id, name: seed.name },
      });

      if (existing) {
        await prisma.stageInterventionTemplate.update({
          where: { id: existing.id },
          data,
        });
        continue;
      }

      await prisma.stageInterventionTemplate.create({ data });
    }
  }
}

export async function seedCareTaskTemplatesFromPathwayInterventions(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
) {
  const uniqueTemplates = new Map<string, InterventionSeed & { sourcePathwayCodes: string[] }>();

  for (const [pathwayCode, interventions] of Object.entries(PATHWAY_INTERVENTIONS)) {
    for (const intervention of interventions) {
      const existing = uniqueTemplates.get(intervention.name);
      if (existing) {
        existing.sourcePathwayCodes.push(pathwayCode);
        continue;
      }

      uniqueTemplates.set(intervention.name, {
        ...intervention,
        sourcePathwayCodes: [pathwayCode],
      });
    }
  }

  console.log(`   Upserting ${uniqueTemplates.size} care task templates from pathway interventions...`);

  for (const template of uniqueTemplates.values()) {
    const metadata = {
      ...(template.metadata ?? {}),
      source: 'pathway_intervention_seed',
      sourcePathwayCodes: template.sourcePathwayCodes,
      sourceStageCode: template.stageCode,
    };

    const data = {
      tenantId,
      interventionType: template.interventionType,
      name: template.name,
      description: template.description,
      careSetting: template.careSetting ?? 'any',
      deliveryMode: template.deliveryMode ?? 'in_person',
      frequencyType: template.frequencyType ?? 'once',
      frequencyValue: template.frequencyValue,
      startDayOffset: template.startDayOffset ?? 0,
      endDayOffset: template.endDayOffset,
      defaultOwnerRole: template.defaultOwnerRole,
      autoCompleteSource: template.autoCompleteSource,
      autoCompleteEventType: template.autoCompleteEventType,
      priority: template.priority ?? 2,
      isCritical: template.isCritical ?? false,
      isActive: true,
      reminderConfig: (template.reminderConfig ?? { beforeDueDays: [1, 0] }) as Prisma.InputJsonValue,
      metadata: metadata as Prisma.InputJsonValue,
      updatedBy: userId,
    };

    const existing = await prisma.careTaskTemplate.findFirst({
      where: { tenantId, name: template.name },
    });

    if (existing) {
      await prisma.careTaskTemplate.update({
        where: { id: existing.id },
        data,
      });
      continue;
    }

    await prisma.careTaskTemplate.create({
      data: {
        ...data,
        createdBy: userId,
      },
    });
  }
}
