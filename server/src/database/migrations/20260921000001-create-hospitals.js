/**
 * Migration: Create Hospitals Table
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('hospitals', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    slug: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    logo_url: {
      type: Sequelize.STRING,
      allowNull: true,
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

  await queryInterface.addIndex('hospitals', ['status'], {
    name: 'hospitals_status_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('hospitals');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_hospitals_status;');
};
