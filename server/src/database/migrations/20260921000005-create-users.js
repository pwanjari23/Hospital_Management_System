/**
 * Migration: Create Users Table
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('users', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false,
    },
    hospital_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'hospitals',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    password_hash: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
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

  // Unique constraint scoped to hospital tenant
  await queryInterface.addConstraint('users', {
    fields: ['hospital_id', 'email'],
    type: 'unique',
    name: 'users_hospital_id_email_unique',
  });

  // Query performance indexes
  await queryInterface.addIndex('users', ['hospital_id'], {
    name: 'users_hospital_id_idx',
  });

  await queryInterface.addIndex('users', ['status'], {
    name: 'users_status_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('users');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_users_status;');
};
