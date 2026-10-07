/**
 * Migration: Add staff and doctor profile fields to Users table (Phase 5 - Module 2)
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('users', 'department_id', {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id',
    },
    onDelete: 'SET NULL',
  });

  await queryInterface.addColumn('users', 'phone', {
    type: Sequelize.STRING(30),
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'qualification', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'specialization', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'license_number', {
    type: Sequelize.STRING(100),
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'experience_years', {
    type: Sequelize.INTEGER,
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'consultation_fee', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.0,
  });

  await queryInterface.addIndex('users', ['hospital_id', 'department_id'], {
    name: 'users_hospital_id_department_id_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeIndex('users', 'users_hospital_id_department_id_idx');
  await queryInterface.removeColumn('users', 'consultation_fee');
  await queryInterface.removeColumn('users', 'experience_years');
  await queryInterface.removeColumn('users', 'license_number');
  await queryInterface.removeColumn('users', 'specialization');
  await queryInterface.removeColumn('users', 'qualification');
  await queryInterface.removeColumn('users', 'phone');
  await queryInterface.removeColumn('users', 'department_id');
};
