/**
 * Migration: Create UserRoles Junction Table
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('user_roles', {
    user_id: {
      type: Sequelize.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    role_id: {
      type: Sequelize.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
      onDelete: 'RESTRICT',
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

  await queryInterface.addIndex('user_roles', ['role_id'], {
    name: 'user_roles_role_id_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('user_roles');
};
