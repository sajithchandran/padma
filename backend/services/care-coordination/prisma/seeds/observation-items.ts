import type { PrismaClient } from '../../node_modules/.prisma/client';

type ObservationSeedItem = {
  code: string;
  name: string;
  category: string;
  dataType: string;
  unit?: string;
  normalRangeMin?: string;
  normalRangeMax?: string;
  criticalLow?: string;
  criticalHigh?: string;
  precisionScale?: number;
  isMandatory?: boolean;
  displayOrder: number;
  description?: string;
};

export const OBSERVATION_ITEM_SEEDS: ObservationSeedItem[] = [
  {
    code: 'HBA1C',
    name: 'HbA1c',
    category: 'laboratory',
    dataType: 'numeric',
    unit: '%',
    normalRangeMin: '4.0',
    normalRangeMax: '5.6',
    criticalHigh: '9.0',
    precisionScale: 2,
    isMandatory: true,
    displayOrder: 10,
    description: 'Glycated hemoglobin used for diabetes diagnosis and longitudinal glycemic control monitoring.',
  },
  {
    code: 'FASTING_GLUCOSE',
    name: 'Fasting Glucose',
    category: 'laboratory',
    dataType: 'numeric',
    unit: 'mg/dL',
    normalRangeMin: '70',
    normalRangeMax: '99',
    criticalLow: '54',
    criticalHigh: '250',
    precisionScale: 1,
    isMandatory: true,
    displayOrder: 20,
    description: 'Fasting blood glucose value, typically captured after at least 8 hours of fasting.',
  },
  {
    code: 'POSTPRANDIAL_GLUCOSE',
    name: 'Postprandial Glucose',
    category: 'laboratory',
    dataType: 'numeric',
    unit: 'mg/dL',
    normalRangeMin: '70',
    normalRangeMax: '140',
    criticalLow: '54',
    criticalHigh: '300',
    precisionScale: 1,
    displayOrder: 30,
    description: 'Blood glucose value measured after a meal, commonly used in diabetes monitoring.',
  },
  {
    code: 'RANDOM_GLUCOSE',
    name: 'Random Glucose',
    category: 'laboratory',
    dataType: 'numeric',
    unit: 'mg/dL',
    criticalLow: '54',
    criticalHigh: '300',
    precisionScale: 1,
    displayOrder: 40,
    description: 'Non-fasting glucose value from lab, point-of-care, device, or patient entry.',
  },
  {
    code: 'WEIGHT',
    name: 'Weight',
    category: 'anthropometry',
    dataType: 'numeric',
    unit: 'kg',
    criticalLow: '30',
    criticalHigh: '180',
    precisionScale: 2,
    displayOrder: 50,
    description: 'Patient body weight captured in clinic, home care, or connected device workflows.',
  },
  {
    code: 'HEIGHT',
    name: 'Height',
    category: 'anthropometry',
    dataType: 'numeric',
    unit: 'cm',
    precisionScale: 1,
    displayOrder: 60,
    description: 'Patient height used for BMI and clinical dosing calculations.',
  },
  {
    code: 'BMI',
    name: 'Body Mass Index',
    category: 'anthropometry',
    dataType: 'numeric',
    unit: 'kg/m2',
    normalRangeMin: '18.5',
    normalRangeMax: '24.9',
    criticalLow: '16',
    criticalHigh: '40',
    precisionScale: 2,
    displayOrder: 70,
    description: 'Derived or entered body mass index.',
  },
  {
    code: 'SYSTOLIC_BP',
    name: 'Systolic Blood Pressure',
    category: 'vitals',
    dataType: 'numeric',
    unit: 'mmHg',
    normalRangeMin: '90',
    normalRangeMax: '120',
    criticalLow: '80',
    criticalHigh: '180',
    precisionScale: 0,
    isMandatory: true,
    displayOrder: 80,
    description: 'Systolic blood pressure value captured independently for rule and risk evaluation.',
  },
  {
    code: 'DIASTOLIC_BP',
    name: 'Diastolic Blood Pressure',
    category: 'vitals',
    dataType: 'numeric',
    unit: 'mmHg',
    normalRangeMin: '60',
    normalRangeMax: '80',
    criticalLow: '45',
    criticalHigh: '120',
    precisionScale: 0,
    isMandatory: true,
    displayOrder: 90,
    description: 'Diastolic blood pressure value captured independently for rule and risk evaluation.',
  },
  {
    code: 'HEART_RATE',
    name: 'Heart Rate',
    category: 'vitals',
    dataType: 'numeric',
    unit: 'bpm',
    normalRangeMin: '60',
    normalRangeMax: '100',
    criticalLow: '40',
    criticalHigh: '130',
    precisionScale: 0,
    displayOrder: 100,
    description: 'Resting or measured heart rate from clinician, patient, or device source.',
  },
  {
    code: 'SPO2',
    name: 'Oxygen Saturation',
    category: 'vitals',
    dataType: 'numeric',
    unit: '%',
    normalRangeMin: '95',
    normalRangeMax: '100',
    criticalLow: '90',
    precisionScale: 0,
    displayOrder: 110,
    description: 'Peripheral oxygen saturation, useful for respiratory and acute deterioration monitoring.',
  },
  {
    code: 'CREATININE',
    name: 'Serum Creatinine',
    category: 'laboratory',
    dataType: 'numeric',
    unit: 'mg/dL',
    normalRangeMin: '0.6',
    normalRangeMax: '1.3',
    criticalHigh: '3.0',
    precisionScale: 2,
    displayOrder: 120,
    description: 'Renal function marker used for chronic disease and medication safety monitoring.',
  },
  {
    code: 'EGFR',
    name: 'eGFR',
    category: 'laboratory',
    dataType: 'numeric',
    unit: 'mL/min/1.73m2',
    normalRangeMin: '90',
    criticalLow: '30',
    precisionScale: 0,
    displayOrder: 130,
    description: 'Estimated glomerular filtration rate used for renal risk stratification.',
  },
  {
    code: 'URINE_MICROALBUMIN',
    name: 'Urine Microalbumin',
    category: 'laboratory',
    dataType: 'numeric',
    unit: 'mg/g',
    normalRangeMin: '0',
    normalRangeMax: '30',
    criticalHigh: '300',
    precisionScale: 1,
    displayOrder: 140,
    description: 'Urine albumin-to-creatinine marker used for diabetic nephropathy screening.',
  },
  {
    code: 'LDL',
    name: 'LDL Cholesterol',
    category: 'laboratory',
    dataType: 'numeric',
    unit: 'mg/dL',
    normalRangeMax: '100',
    criticalHigh: '190',
    precisionScale: 1,
    displayOrder: 150,
    description: 'Low-density lipoprotein cholesterol used for cardiac risk management.',
  },
  {
    code: 'HDL',
    name: 'HDL Cholesterol',
    category: 'laboratory',
    dataType: 'numeric',
    unit: 'mg/dL',
    normalRangeMin: '40',
    precisionScale: 1,
    displayOrder: 160,
    description: 'High-density lipoprotein cholesterol.',
  },
  {
    code: 'TRIGLYCERIDES',
    name: 'Triglycerides',
    category: 'laboratory',
    dataType: 'numeric',
    unit: 'mg/dL',
    normalRangeMax: '150',
    criticalHigh: '500',
    precisionScale: 1,
    displayOrder: 170,
    description: 'Triglyceride level used for metabolic and cardiac risk assessment.',
  },
  {
    code: 'ADHERENCE_SCORE',
    name: 'Adherence Score',
    category: 'adherence',
    dataType: 'numeric',
    unit: '%',
    normalRangeMin: '80',
    normalRangeMax: '100',
    criticalLow: '50',
    precisionScale: 1,
    displayOrder: 180,
    description: 'Calculated or manually entered adherence score for care plan compliance.',
  },
  {
    code: 'HYPOGLYCEMIA_EPISODE',
    name: 'Hypoglycemia Episode',
    category: 'symptom',
    dataType: 'boolean',
    displayOrder: 190,
    description: 'Indicates whether the patient reported or recorded a hypoglycemia episode.',
  },
  {
    code: 'FOOT_EXAM_STATUS',
    name: 'Foot Exam Status',
    category: 'screening',
    dataType: 'coded',
    displayOrder: 200,
    description: 'Diabetes foot screening status.',
  },
  {
    code: 'EYE_EXAM_STATUS',
    name: 'Eye Exam Status',
    category: 'screening',
    dataType: 'coded',
    displayOrder: 210,
    description: 'Diabetes retinal screening status.',
  },
];

const ALLOWED_VALUES_BY_CODE: Record<string, unknown> = {
  FOOT_EXAM_STATUS: ['normal', 'abnormal', 'referred', 'not_done'],
  EYE_EXAM_STATUS: ['normal', 'abnormal', 'referred', 'not_done'],
};

export async function seedObservationItems(prisma: PrismaClient, tenantId: string) {
  console.log(`   Upserting ${OBSERVATION_ITEM_SEEDS.length} observation item master records...`);

  for (const item of OBSERVATION_ITEM_SEEDS) {
    const code = item.code.trim().toUpperCase();
    const existing = await prisma.observationItemMaster.findFirst({
      where: { tenantId, code },
    });

    const data = {
      ...item,
      code,
      isActive: true,
      isMandatory: item.isMandatory ?? false,
      allowedValues: ALLOWED_VALUES_BY_CODE[code] ?? undefined,
    };

    if (existing) {
      await prisma.observationItemMaster.update({
        where: { id: existing.id },
        data,
      });
      continue;
    }

    await prisma.observationItemMaster.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }
}
