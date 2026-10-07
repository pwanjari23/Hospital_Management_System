/**
 * Migration: Add additional profile configuration fields to Hospitals table (Phase 5 - Module 4)
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('hospitals', 'alternate_phone', {
    type: Sequelize.STRING(50),
    allowNull: true,
  });

  await queryInterface.addColumn('hospitals', 'website', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });

  await queryInterface.addColumn('hospitals', 'working_hours', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });

  await queryInterface.addColumn('hospitals', 'timezone', {
    type: Sequelize.STRING(50),
    allowNull: true,
    defaultValue: 'Asia/Kolkata',
  });

  await queryInterface.addColumn('hospitals', 'currency', {
    type: Sequelize.STRING(10),
    allowNull: true,
    defaultValue: 'INR',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn('hospitals', 'currency');
  await queryInterface.removeColumn('hospitals', 'timezone');
  await queryInterface.removeColumn('hospitals', 'working_hours');
  await queryInterface.removeColumn('hospitals', 'website');
  await queryInterface.removeColumn('hospitals', 'alternate_phone');
};
