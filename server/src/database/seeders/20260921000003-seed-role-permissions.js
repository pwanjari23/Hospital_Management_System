/**
 * Seeder: Role-Permission Initial Mappings
 */
export const up = async (queryInterface) => {
  const [roles] = await queryInterface.sequelize.query(`SELECT id, name FROM roles;`);
  const [permissions] = await queryInterface.sequelize.query(`SELECT id, name FROM permissions;`);

  if (!roles || !permissions || roles.length === 0 || permissions.length === 0) {
    console.warn('Roles or Permissions not found. Skipping RolePermission seeding.');
    return;
  }

  const roleMap = new Map(roles.map((r) => [r.name, r.id]));
  const permMap = new Map(permissions.map((p) => [p.name, p.id]));

  const superAdminId = roleMap.get('SUPER_ADMIN');
  const hospitalAdminId = roleMap.get('HOSPITAL_ADMIN');

  const now = new Date();
  const assignments = [];

  // SUPER_ADMIN gets all permissions
  if (superAdminId) {
    for (const permId of permMap.values()) {
      assignments.push({
        role_id: superAdminId,
        permission_id: permId,
        created_at: now,
        updated_at: now,
      });
    }
  }

  // HOSPITAL_ADMIN gets hospital and user operational permissions
  if (hospitalAdminId) {
    const hospitalAdminPerms = [
      'hospital.read',
      'hospital.update',
      'user.read',
      'user.create',
      'user.update',
      'role.read',
      'permission.read',
    ];

    for (const permName of hospitalAdminPerms) {
      const permId = permMap.get(permName);
      if (permId) {
        assignments.push({
          role_id: hospitalAdminId,
          permission_id: permId,
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  // Idempotent bulk insertion
  for (const assignment of assignments) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT role_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1;`,
      { replacements: { roleId: assignment.role_id, permissionId: assignment.permission_id } }
    );
    if (!existing || existing.length === 0) {
      await queryInterface.bulkInsert('role_permissions', [assignment]);
    }
  }
};

export const down = async (queryInterface) => {
  await queryInterface.bulkDelete('role_permissions', null, {});
};
