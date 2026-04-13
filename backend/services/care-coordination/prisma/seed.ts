import { PrismaClient } from '../node_modules/.prisma/client';
import * as bcrypt from 'bcrypt';
import { seedObservationItems } from './seeds/observation-items';
import {
  seedCareTaskTemplatesFromPathwayInterventions,
  seedPathwayInterventions,
} from './seeds/pathway-interventions';

const DEMO_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Padma@123';
const BCRYPT_ROUNDS = 12;

const prisma = new PrismaClient();

// ─── Permissions ─────────────────────────────────────────────────────────────

const PERMISSIONS = [
  { code: 'pathway:create',   resource: 'pathway',       action: 'create',            description: 'Create a clinical pathway' },
  { code: 'pathway:read',     resource: 'pathway',       action: 'read',              description: 'View clinical pathways' },
  { code: 'pathway:update',   resource: 'pathway',       action: 'update',            description: 'Edit a clinical pathway' },
  { code: 'pathway:delete',   resource: 'pathway',       action: 'delete',            description: 'Delete a clinical pathway' },
  { code: 'pathway:publish',  resource: 'pathway',       action: 'publish',           description: 'Publish a pathway draft to active' },
  { code: 'task:read',        resource: 'task',          action: 'read',              description: 'View care tasks' },
  { code: 'task:create',      resource: 'task',          action: 'create',            description: 'Create care tasks manually' },
  { code: 'task:complete',    resource: 'task',          action: 'complete',          description: 'Mark a task as completed' },
  { code: 'task:skip',        resource: 'task',          action: 'skip',              description: 'Skip a care task' },
  { code: 'task:escalate',    resource: 'task',          action: 'escalate',          description: 'Escalate a care task' },
  { code: 'task:reassign',    resource: 'task',          action: 'reassign',          description: 'Reassign a care task to another user' },
  { code: 'enrollment:create', resource: 'enrollment',  action: 'create',            description: 'Enroll a patient in a pathway' },
  { code: 'enrollment:read',   resource: 'enrollment',  action: 'read',              description: 'View patient enrollments' },
  { code: 'enrollment:update', resource: 'enrollment',  action: 'update',            description: 'Update enrollment details' },
  { code: 'enrollment:cancel', resource: 'enrollment',  action: 'cancel',            description: 'Cancel a patient enrollment' },
  { code: 'patient:view_pii',  resource: 'patient',     action: 'view_pii',          description: 'View patient PII (name, DOB, MRN)' },
  { code: 'patient:anonymize', resource: 'patient',     action: 'anonymize',         description: 'Erase / anonymize patient data (GDPR)' },
  { code: 'admin:manage_users',  resource: 'admin',     action: 'manage_users',      description: 'Invite, deactivate, and assign roles to users' },
  { code: 'admin:manage_roles',  resource: 'admin',     action: 'manage_roles',      description: 'Create and edit custom roles' },
  { code: 'admin:manage_tenant', resource: 'admin',     action: 'manage_tenant',     description: 'Edit tenant settings and billing' },
  { code: 'communication:send',             resource: 'communication', action: 'send',             description: 'Send messages to patients' },
  { code: 'communication:manage_templates', resource: 'communication', action: 'manage_templates', description: 'Create and approve message templates' },
  { code: 'dashboard:read', resource: 'dashboard', action: 'read', description: 'View care coordination dashboard' },
];

const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: ALL_PERMISSION_CODES,
  supervisor: ALL_PERMISSION_CODES.filter(
    (c) => c !== 'admin:manage_tenant' && c !== 'patient:anonymize',
  ),
  care_coordinator: [
    'task:read', 'task:create', 'task:complete', 'task:skip', 'task:escalate', 'task:reassign',
    'enrollment:create', 'enrollment:read', 'enrollment:update', 'enrollment:cancel',
    'patient:view_pii', 'communication:send', 'dashboard:read',
  ],
  physician: [
    'task:read', 'task:complete', 'enrollment:read', 'patient:view_pii', 'dashboard:read',
  ],
  nurse: [
    'task:read', 'task:complete', 'task:escalate', 'enrollment:read', 'dashboard:read',
  ],
  viewer: [
    'task:read', 'enrollment:read', 'dashboard:read',
  ],
};

const SYSTEM_ROLES = [
  { code: 'admin',            name: 'Administrator',    description: 'Full access including tenant settings and billing' },
  { code: 'supervisor',       name: 'Supervisor',       description: 'Full clinical access; cannot modify tenant settings' },
  { code: 'care_coordinator', name: 'Care Coordinator', description: 'Manages assigned patient enrollments and tasks' },
  { code: 'physician',        name: 'Physician',        description: 'Reviews enrollments and completes clinical tasks' },
  { code: 'nurse',            name: 'Nurse',            description: 'Completes and escalates assigned care tasks' },
  { code: 'viewer',           name: 'Viewer',           description: 'Read-only access with anonymized patient data' },
];

// ─── Demo Clinical Pathways ───────────────────────────────────────────────────

const DEMO_PATHWAYS = [
  {
    code: 'DM-MGMT-001',
    name: 'Diabetes Management',
    category: 'diabetes',
    defaultDurationDays: 365,
    stages: [
      { code: 'INITIAL-ASSESSMENT', name: 'Initial Assessment', stageType: 'entry', sortOrder: 1, expectedDurationDays: 30 },
      { code: 'STABILISATION', name: 'Stabilisation', stageType: 'intermediate', sortOrder: 2, expectedDurationDays: 60 },
      { code: 'MAINTENANCE', name: 'Maintenance', stageType: 'intermediate', sortOrder: 3, expectedDurationDays: 240 },
      { code: 'GRADUATION', name: 'Graduation', stageType: 'terminal', sortOrder: 4, expectedDurationDays: 35 },
    ],
  },
  {
    code: 'HTN-CTRL-001',
    name: 'Hypertension Control',
    category: 'hypertension',
    defaultDurationDays: 180,
    stages: [
      { code: 'INITIAL-ASSESSMENT', name: 'Initial Assessment', stageType: 'entry', sortOrder: 1, expectedDurationDays: 14 },
      { code: 'TITRATION', name: 'Medication Titration', stageType: 'intermediate', sortOrder: 2, expectedDurationDays: 60 },
      { code: 'MONITORING', name: 'Stable Monitoring', stageType: 'intermediate', sortOrder: 3, expectedDurationDays: 90 },
      { code: 'DISCHARGE', name: 'Discharge Planning', stageType: 'terminal', sortOrder: 4, expectedDurationDays: 16 },
    ],
  },
  {
    code: 'CARD-REHAB-001',
    name: 'Post-Cardiac Rehabilitation',
    category: 'cardiac',
    defaultDurationDays: 90,
    stages: [
      { code: 'ACUTE-RECOVERY', name: 'Acute Recovery', stageType: 'entry', sortOrder: 1, expectedDurationDays: 14 },
      { code: 'ACTIVE-REHAB', name: 'Active Rehabilitation', stageType: 'intermediate', sortOrder: 2, expectedDurationDays: 60 },
      { code: 'MAINTENANCE', name: 'Maintenance', stageType: 'terminal', sortOrder: 3, expectedDurationDays: 16 },
    ],
  },
  {
    code: 'COPD-MGMT-001',
    name: 'COPD Management',
    category: 'respiratory',
    defaultDurationDays: 180,
    stages: [
      { code: 'INITIAL-ASSESSMENT', name: 'Initial Assessment', stageType: 'entry', sortOrder: 1, expectedDurationDays: 14 },
      { code: 'EXACERBATION-MGMT', name: 'Exacerbation Management', stageType: 'intermediate', sortOrder: 2, expectedDurationDays: 30 },
      { code: 'STABLE-MONITORING', name: 'Stable Monitoring', stageType: 'intermediate', sortOrder: 3, expectedDurationDays: 120 },
      { code: 'LONG-TERM-CARE', name: 'Long-term Care', stageType: 'terminal', sortOrder: 4, expectedDurationDays: 16 },
    ],
  },
  {
    code: 'OBESITY-MGMT-001',
    name: 'Obesity Management',
    category: 'wellness',
    defaultDurationDays: 365,
    stages: [
      { code: 'LIFESTYLE-BASELINE', name: 'Lifestyle Baseline', stageType: 'entry', sortOrder: 1, expectedDurationDays: 30 },
      { code: 'ACTIVE-INTERVENTION', name: 'Active Intervention', stageType: 'intermediate', sortOrder: 2, expectedDurationDays: 180 },
      { code: 'SUSTAINED-CHANGE', name: 'Sustained Behaviour Change', stageType: 'terminal', sortOrder: 3, expectedDurationDays: 155 },
    ],
  },
];

async function main() {
  console.log('🌱  Seeding padma database...');

  // 1. Permissions
  console.log(`   Upserting ${PERMISSIONS.length} permissions...`);
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
  }

  // 2. System roles
  console.log(`   Upserting ${SYSTEM_ROLES.length} system roles...`);
  const roleMap: Record<string, string> = {};
  for (const roleDef of SYSTEM_ROLES) {
    let role = await prisma.role.findFirst({ where: { tenantId: null, code: roleDef.code } });
    if (!role) {
      role = await prisma.role.create({
        data: { ...roleDef, tenantId: null, isSystem: true, isActive: true },
      });
    } else {
      role = await prisma.role.update({
        where: { id: role.id },
        data: { name: roleDef.name, description: roleDef.description },
      });
    }
    roleMap[roleDef.code] = role.id;
  }

  // 3. Role permissions
  console.log('   Assigning permissions to roles...');
  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleMap[roleCode];
    for (const permCode of permCodes) {
      const perm = await prisma.permission.findUnique({ where: { code: permCode } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: perm.id } },
        update: {},
        create: { roleId, permissionId: perm.id },
      });
    }
  }

  // 4. Demo tenant
  const tenantSlug = process.env.SEED_TENANT_SLUG ?? 'demo-healthcare';
  console.log(`   Upserting demo tenant "${tenantSlug}"...`);
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      slug: tenantSlug,
      name: 'Demo Healthcare Organisation',
      displayName: 'Demo Healthcare',
      status: 'ACTIVE',
      country: 'AE',
      timezone: 'Asia/Dubai',
      locale: 'en',
      planTier: 'standard',
    },
  });

  // 5. Admin user
  const adminOidcSub = process.env.SEED_ADMIN_OIDC_SUB ?? 'dev-admin-001';
  const adminEmail   = process.env.SEED_ADMIN_EMAIL    ?? 'admin@padma.dev';
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  console.log(`   Upserting admin user "${adminEmail}" with hashed password...`);
  const user = await prisma.user.upsert({
    where: { oidcSub: adminOidcSub },
    update: { email: adminEmail, passwordHash },
    create: { oidcSub: adminOidcSub, email: adminEmail, passwordHash, displayName: 'Padma Admin', status: 'ACTIVE' },
  });

  // 6. Assign admin role
  const existing = await prisma.userTenantRole.findFirst({
    where: { userId: user.id, tenantId: tenant.id },
  });
  if (!existing) {
    await prisma.userTenantRole.create({
      data: { userId: user.id, tenantId: tenant.id, roleId: roleMap['admin'], isActive: true },
    });
    console.log('   Created admin UserTenantRole.');
  } else {
    console.log('   Admin UserTenantRole already exists — skipped.');
  }

  // 7. Demo clinical pathways
  console.log(`   Upserting ${DEMO_PATHWAYS.length} demo clinical pathways...`);
  for (const pw of DEMO_PATHWAYS) {
    const existing = await prisma.clinicalPathway.findFirst({
      where: { tenantId: tenant.id, code: pw.code, version: 1 },
    });
    if (!existing) {
      await prisma.clinicalPathway.create({
        data: {
          tenantId: tenant.id,
          code: pw.code,
          name: pw.name,
          category: pw.category,
          defaultDurationDays: pw.defaultDurationDays,
          applicableSettings: ['outpatient', 'inpatient', 'home_care'],
          version: 1,
          status: 'active',
          isActive: true,
          createdBy: user.id,
          stages: {
            create: pw.stages.map((s) => ({
              tenantId: tenant.id,
              code: s.code,
              name: s.name,
              stageType: s.stageType,
              sortOrder: s.sortOrder,
              expectedDurationDays: s.expectedDurationDays,
              careSetting: 'any',
              autoTransition: false,
            })),
          },
        },
      });
      console.log(`      Created pathway: ${pw.name}`);
    } else {
      console.log(`      Pathway already exists: ${pw.name}`);
    }
  }

  // 8. Observation item master
  await seedPathwayInterventions(prisma, tenant.id);
  await seedCareTaskTemplatesFromPathwayInterventions(prisma, tenant.id, user.id);
  await seedObservationItems(prisma, tenant.id);

  console.log('✅  Seed complete.');
  console.log(`   Tenant ID : ${tenant.id}`);
  console.log(`   User ID   : ${user.id}`);
  console.log(`   Login     : ${adminEmail}  /  ${DEMO_PASSWORD}`);
  console.log(`   Dev header: x-tenant-id: ${tenant.id}  x-user-id: ${user.id}  x-user-roles: admin`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
