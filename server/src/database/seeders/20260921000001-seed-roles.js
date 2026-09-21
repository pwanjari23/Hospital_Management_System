/**
 * Seeder: System Roles
 */
export const ROLES = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    name: 'SUPER_ADMIN',
    description: 'Platform-level super administrator with unrestricted system access',
    scope: 'PLATFORM',
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    name: 'HOSPITAL_ADMIN',
    description: 'Hospital tenant administrator with full hospital-level management authority',
    scope: 'HOSPITAL',
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    name: 'DOCTOR',
    description: 'Medical doctor providing clinical patient care',
    scope: 'HOSPITAL',
  },
  {
    id: '00000000-0000-4000-a000-000000000004',
    name: 'NURSE',
    description: 'Nursing staff assisting clinical workflows and inpatient care',
    scope: 'HOSPITAL',
  },
  {
    id: '00000000-0000-4000-a000-000000000005',
    name: 'RECEPTIONIST',
    description: 'Front desk reception managing patient registration and scheduling',
    scope: 'HOSPITAL',
  },
  {
    id: '00000000-0000-4000-a000-000000000006',
    name: 'PHARMACIST',
    description: 'Pharmacy staff managing medications and dispensing',
    scope: 'HOSPITAL',
  },
  {
    id: '00000000-0000-4000-a000-000000000007',
    name: 'LAB_STAFF',
    description: 'Laboratory personnel managing diagnostic tests and results',
    scope: 'HOSPITAL',
  },
];

export const up = async (queryInterface) => {
  const now = new Date();
  const records = ROLES.map((role) => ({
    ...role,
    created_at: now,
    updated_at: now,
  }));

  // Upsert or insert ignore for idempotency
  for (const record of records) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = :name LIMIT 1;`,
      { replacements: { name: record.name } }
    );
    if (!existing || existing.length === 0) {
      await queryInterface.bulkInsert('roles', [record]);
    }
  }
};

export const down = async (queryInterface, Sequelize) => {
  const roleNames = ROLES.map((r) => r.name);
  await queryInterface.bulkDelete('roles', {
    name: {
      [Sequelize.Op.in]: roleNames,
    },
  });
};
