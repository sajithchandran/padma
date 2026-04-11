import { PrismaClient } from '../node_modules/.prisma/client-core';

const prisma = new PrismaClient();

// ─── Permissions ─────────────────────────────────────────────────────────────

const PERMISSIONS = [
  // Pathway management
  { code: 'pathway:create',   resource: 'pathway',       action: 'create',            description: 'Create a clinical pathway' },
  { code: 'pathway:read',     resource: 'pathway',       action: 'read',              description: 'View clinical pathways' },
  { code: 'pathway:update',   resource: 'pathway',       action: 'update',            description: 'Edit a clinical pathway' },
  { code: 'pathway:delete',   resource: 'pathway',       action: 'delete',            description: 'Delete a clinical pathway' },
  { code: 'pathway:publish',  resource: 'pathway',       action: 'publish',           description: 'Publish a pathway draft to active' },

  // Task management
  { code: 'task:read',        resource: 'task',          action: 'read',              description: 'View care tasks' },
  { code: 'task:create',      resource: 'task',          action: 'create',            description: 'Create care tasks manually' },
  { code: 'task:complete',    resource: 'task',          action: 'complete',          description: 'Mark a task as completed' },
  { code: 'task:skip',        resource: 'task',          action: 'skip',              description: 'Skip a care task' },
  { code: 'task:escalate',    resource: 'task',          action: 'escalate',          description: 'Escalate a care task' },
  { code: 'task:reassign',    resource: 'task',          action: 'reassign',          description: 'Reassign a care task to another user' },

  // Enrollment management
  { code: 'enrollment:create', resource: 'enrollment',  action: 'create',            description: 'Enroll a patient in a pathway' },
  { code: 'enrollment:read',   resource: 'enrollment',  action: 'read',              description: 'View patient enrollments' },
  { code: 'enrollment:update', resource: 'enrollment',  action: 'update',            description: 'Update enrollment details' },
  { code: 'enrollment:cancel', resource: 'enrollment',  action: 'cancel',            description: 'Cancel a patient enrollment' },

  // Patient data
  { code: 'patient:view_pii',  resource: 'patient',     action: 'view_pii',          description: 'View patient PII (name, DOB, MRN)' },
  { code: 'patient:anonymize', resource: 'patient',     action: 'anonymize',         description: 'Erase / anonymize patient data (GDPR)' },

  // Administration
  { code: 'admin:manage_users',  resource: 'admin',     action: 'manage_users',      description: 'Invite, deactivate, and assign roles to users' },
  { code: 'admin:manage_roles',  resource: 'admin',     action: 'manage_roles',      description: 'Create and edit custom roles' },
  { code: 'admin:manage_tenant', resource: 'admin',     action: 'manage_tenant',     description: 'Edit tenant settings and billing' },

  // Communication
  { code: 'communication:send',             resource: 'communication', action: 'send',             description: 'Send messages to patients' },
  { code: 'communication:manage_templates', resource: 'communication', action: 'manage_templates', description: 'Create and approve message templates' },

  // Dashboard
  { code: 'dashboard:read', resource: 'dashboard', action: 'read', description: 'View care coordination dashboard' },
];

// ─── Role → Permission mappings ──────────────────────────────────────────────

const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: ALL_PERMISSION_CODES,

  supervisor: ALL_PERMISSION_CODES.filter(
    (c) => c !== 'admin:manage_tenant' && c !== 'patient:anonymize',
  ),

  care_coordinator: [
    'task:read', 'task:create', 'task:complete', 'task:skip', 'task:escalate', 'task:reassign',
    'enrollment:create', 'enrollment:read', 'enrollment:update', 'enrollment:cancel',
    'patient:view_pii',
    'communication:send',
    'dashboard:read',
  ],

  physician: [
    'task:read', 'task:complete',
    'enrollment:read',
    'patient:view_pii',
    'dashboard:read',
  ],

  nurse: [
    'task:read', 'task:complete', 'task:escalate',
    'enrollment:read',
    'dashboard:read',
  ],

  viewer: [
    'task:read',
    'enrollment:read',
    'dashboard:read',
    // Note: no patient:view_pii — viewers see anonymized data only
  ],
};

const SYSTEM_ROLES = [
  { code: 'admin',            name: 'Administrator',       description: 'Full access including tenant settings and billing' },
  { code: 'supervisor',       name: 'Supervisor',          description: 'Full clinical access; cannot modify tenant settings' },
  { code: 'care_coordinator', name: 'Care Coordinator',    description: 'Manages assigned patient enrollments and tasks' },
  { code: 'physician',        name: 'Physician',           description: 'Reviews enrollments and completes clinical tasks' },
  { code: 'nurse',            name: 'Nurse',               description: 'Completes and escalates assigned care tasks' },
  { code: 'viewer',           name: 'Viewer',              description: 'Read-only access with anonymized patient data' },
];

const CARE_TASK_TEMPLATES = [
  {
    name: 'Initial Nurse Assessment',
    interventionType: 'assessment',
    description: 'Baseline nursing assessment to capture symptoms, vitals, and immediate care needs.',
    careSetting: 'outpatient',
    deliveryMode: 'in_person',
    frequencyType: 'once',
    startDayOffset: 0,
    endDayOffset: 0,
    defaultOwnerRole: 'nurse',
    priority: 3,
    isCritical: true,
    reminderConfig: { beforeDueDays: [0] },
  },
  {
    name: 'Physician Consultation',
    interventionType: 'consultation',
    description: 'Physician review for diagnosis confirmation and treatment planning.',
    careSetting: 'outpatient',
    deliveryMode: 'in_person',
    frequencyType: 'once',
    startDayOffset: 1,
    endDayOffset: 3,
    defaultOwnerRole: 'physician',
    priority: 4,
    isCritical: true,
    reminderConfig: { beforeDueDays: [1, 0] },
  },
  {
    name: 'HbA1c Lab Test',
    interventionType: 'lab_test',
    description: 'Laboratory HbA1c test for baseline or interval glycemic control review.',
    careSetting: 'outpatient',
    deliveryMode: 'in_person',
    frequencyType: 'once',
    startDayOffset: 0,
    endDayOffset: 7,
    defaultOwnerRole: 'care_coordinator',
    autoCompleteSource: 'athma_lab',
    autoCompleteEventType: 'lab_result.available',
    priority: 4,
    isCritical: false,
    reminderConfig: { beforeDueDays: [2, 0] },
  },
  {
    name: 'Weekly Care Coordinator Follow-up',
    interventionType: 'follow_up',
    description: 'Weekly coordination follow-up call to review adherence, symptoms, and blockers.',
    careSetting: 'home_care',
    deliveryMode: 'telehealth',
    frequencyType: 'weekly',
    startDayOffset: 7,
    endDayOffset: 84,
    defaultOwnerRole: 'care_coordinator',
    priority: 2,
    isCritical: false,
    reminderConfig: { beforeDueDays: [1, 0] },
  },
  {
    name: 'Patient Education Session',
    interventionType: 'education',
    description: 'Structured education session covering disease knowledge, lifestyle, and red flags.',
    careSetting: 'any',
    deliveryMode: 'telehealth',
    frequencyType: 'once',
    startDayOffset: 2,
    endDayOffset: 14,
    defaultOwnerRole: 'care_coordinator',
    priority: 2,
    isCritical: false,
    reminderConfig: { beforeDueDays: [2] },
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding padma_core...');

  // 1. Upsert permissions
  console.log(`   Upserting ${PERMISSIONS.length} permissions...`);
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
  }

  // 2. Upsert system roles (tenantId = null)
  console.log(`   Upserting ${SYSTEM_ROLES.length} system roles...`);
  const roleMap: Record<string, string> = {}; // code → id

  for (const roleDef of SYSTEM_ROLES) {
    // System roles have tenantId = null; the @@unique is on [tenantId, code].
    // Prisma requires a compound unique for upsert — use updateMany + create pattern.
    let role = await prisma.role.findFirst({
      where: { tenantId: null, code: roleDef.code },
    });
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

  // 3. Assign permissions to roles
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

  // 5. First admin user
  const adminOidcSub = process.env.SEED_ADMIN_OIDC_SUB ?? 'dev-admin-001';
  const adminEmail   = process.env.SEED_ADMIN_EMAIL    ?? 'admin@padma.dev';
  console.log(`   Upserting admin user "${adminEmail}"...`);
  const user = await prisma.user.upsert({
    where: { oidcSub: adminOidcSub },
    update: { email: adminEmail },
    create: {
      oidcSub: adminOidcSub,
      email: adminEmail,
      displayName: 'Padma Admin',
      status: 'ACTIVE',
    },
  });

  // 6. Assign admin role to the user within the demo tenant
  const adminRoleId = roleMap['admin'];
  const existing = await prisma.userTenantRole.findFirst({
    where: { userId: user.id, tenantId: tenant.id },
  });
  if (!existing) {
    await prisma.userTenantRole.create({
      data: { userId: user.id, tenantId: tenant.id, roleId: adminRoleId, isActive: true },
    });
    console.log('   Created admin UserTenantRole.');
  } else {
    console.log('   Admin UserTenantRole already exists — skipped.');
  }

  // 7. Reusable care task template library
  console.log(`   Upserting ${CARE_TASK_TEMPLATES.length} care task templates...`);
  for (const template of CARE_TASK_TEMPLATES) {
    const existingTemplate = await prisma.careTaskTemplate.findFirst({
      where: { tenantId: tenant.id, name: template.name },
    });

    if (existingTemplate) {
      await prisma.careTaskTemplate.update({
        where: { id: existingTemplate.id },
        data: {
          ...template,
          updatedBy: user.id,
        },
      });
      continue;
    }

    await prisma.careTaskTemplate.create({
      data: {
        tenantId: tenant.id,
        ...template,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
  }

  console.log('✅  Seed complete.');
  console.log(`   Tenant ID : ${tenant.id}`);
  console.log(`   User ID   : ${user.id}`);
  console.log(`   Dev header: x-tenant-id: ${tenant.id}  x-user-id: ${user.id}  x-user-roles: admin`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
