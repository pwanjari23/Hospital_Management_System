/**
 * Migration: Create Roles Table
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('roles', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    scope: {
      type: Sequelize.ENUM('PLATFORM', 'HOSPITAL'),
      allowNull: false,
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

  await queryInterface.addIndex('roles', ['scope'], {
    name: 'roles_scope_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('roles');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_roles_scope;');
};
