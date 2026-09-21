/**
 * Seeder: Foundational Permissions
 */
export const PERMISSIONS = [
  {
    id: '00000000-0000-4000-b000-000000000001',
    name: 'hospital.read',
    description: 'View hospital tenant information and profile',
  },
  {
    id: '00000000-0000-4000-b000-000000000002',
    name: 'hospital.update',
    description: 'Modify hospital profile and configuration settings',
  },
  {
    id: '00000000-0000-4000-b000-000000000003',
    name: 'user.read',
    description: 'View hospital staff and user accounts',
  },
  {
    id: '00000000-0000-4000-b000-000000000004',
    name: 'user.create',
    description: 'Create new hospital user accounts',
  },
  {
    id: '00000000-0000-4000-b000-000000000005',
    name: 'user.update',
    description: 'Update hospital user details and status',
  },
  {
    id: '00000000-0000-4000-b000-000000000006',
    name: 'role.read',
    description: 'View role definitions and assigned privileges',
  },
  {
    id: '00000000-0000-4000-b000-000000000007',
    name: 'permission.read',
    description: 'View system-level permission catalogue',
  },
];

export const up = async (queryInterface) => {
  const now = new Date();
  const records = PERMISSIONS.map((perm) => ({
    ...perm,
    created_at: now,
    updated_at: now,
  }));

  // Idempotent insertion
  for (const record of records) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE name = :name LIMIT 1;`,
      { replacements: { name: record.name } }
    );
    if (!existing || existing.length === 0) {
      await queryInterface.bulkInsert('permissions', [record]);
    }
  }
};

export const down = async (queryInterface, Sequelize) => {
  const permissionNames = PERMISSIONS.map((p) => p.name);
  await queryInterface.bulkDelete('permissions', {
    name: {
      [Sequelize.Op.in]: permissionNames,
    },
  });
};
