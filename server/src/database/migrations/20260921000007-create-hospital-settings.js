/**
 * Migration: Create HospitalSettings Table
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('hospital_settings', {
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
    key: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    value: {
      type: Sequelize.TEXT,
      allowNull: true,
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

  await queryInterface.addConstraint('hospital_settings', {
    fields: ['hospital_id', 'key'],
    type: 'unique',
    name: 'hospital_settings_hospital_id_key_unique',
  });

  await queryInterface.addIndex('hospital_settings', ['hospital_id'], {
    name: 'hospital_settings_hospital_id_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('hospital_settings');
};
