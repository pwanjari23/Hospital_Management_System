/**
 * Migration: Create Departments Table (Phase 5 - Module 1)
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('departments', {
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
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    code: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // Composite unique constraint: UNIQUE(hospital_id, name)
  await queryInterface.addIndex('departments', ['hospital_id', 'name'], {
    unique: true,
    name: 'departments_hospital_id_name_unique',
  });

  // Performance query indexes
  await queryInterface.addIndex('departments', ['hospital_id', 'status'], {
    name: 'departments_hospital_id_status_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('departments');
  // Clean up enum type in PostgreSQL
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_departments_status";');
};
