/**
 * Migration: Create Hospital Sequences Table (Concurrency-Safe UHID / Counter Management)
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('hospital_sequences', {
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
      onDelete: 'CASCADE',
    },
    sequence_type: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'PATIENT',
    },
    prefix: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'HOSP',
    },
    last_value: {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 0,
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

  // Enforce unique sequence per hospital and sequence type
  await queryInterface.addConstraint('hospital_sequences', {
    fields: ['hospital_id', 'sequence_type'],
    type: 'unique',
    name: 'hospital_sequences_hospital_id_type_unique',
  });

  await queryInterface.addIndex('hospital_sequences', ['hospital_id', 'sequence_type'], {
    name: 'hospital_sequences_lookup_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('hospital_sequences');
};
