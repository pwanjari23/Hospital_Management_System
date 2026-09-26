/**
 * Migration: Add contact and address fields to hospitals table
 * Adds: email, phone, address, city, state, country, postal_code
 * Adds query performance indexes on name and created_at
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('hospitals', 'email', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });

  await queryInterface.addColumn('hospitals', 'phone', {
    type: Sequelize.STRING(50),
    allowNull: true,
  });

  await queryInterface.addColumn('hospitals', 'address', {
    type: Sequelize.TEXT,
    allowNull: true,
  });

  await queryInterface.addColumn('hospitals', 'city', {
    type: Sequelize.STRING(100),
    allowNull: true,
  });

  await queryInterface.addColumn('hospitals', 'state', {
    type: Sequelize.STRING(100),
    allowNull: true,
  });

  await queryInterface.addColumn('hospitals', 'country', {
    type: Sequelize.STRING(100),
    allowNull: true,
    defaultValue: 'India',
  });

  await queryInterface.addColumn('hospitals', 'postal_code', {
    type: Sequelize.STRING(20),
    allowNull: true,
  });

  await queryInterface.addIndex('hospitals', ['name'], {
    name: 'hospitals_name_idx',
  });

  await queryInterface.addIndex('hospitals', ['created_at'], {
    name: 'hospitals_created_at_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeIndex('hospitals', 'hospitals_created_at_idx');
  await queryInterface.removeIndex('hospitals', 'hospitals_name_idx');
  await queryInterface.removeColumn('hospitals', 'postal_code');
  await queryInterface.removeColumn('hospitals', 'country');
  await queryInterface.removeColumn('hospitals', 'state');
  await queryInterface.removeColumn('hospitals', 'city');
  await queryInterface.removeColumn('hospitals', 'address');
  await queryInterface.removeColumn('hospitals', 'phone');
  await queryInterface.removeColumn('hospitals', 'email');
};
