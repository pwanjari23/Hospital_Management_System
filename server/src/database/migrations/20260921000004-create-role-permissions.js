/**
 * Migration: Create RolePermissions Junction Table
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('role_permissions', {
    role_id: {
      type: Sequelize.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    permission_id: {
      type: Sequelize.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'permissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('role_permissions', ['permission_id'], {
    name: 'role_permissions_permission_id_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('role_permissions');
};
