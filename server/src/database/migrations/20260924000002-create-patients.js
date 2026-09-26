/**
 * Migration: Create Patients Table (Module 4)
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('patients', {
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
    uhid: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    first_name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    middle_name: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    last_name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    date_of_birth: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    gender: {
      type: Sequelize.ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'),
      allowNull: false,
    },
    blood_group: {
      type: Sequelize.ENUM(
        'A_POSITIVE',
        'A_NEGATIVE',
        'B_POSITIVE',
        'B_NEGATIVE',
        'AB_POSITIVE',
        'AB_NEGATIVE',
        'O_POSITIVE',
        'O_NEGATIVE',
        'UNKNOWN'
      ),
      allowNull: false,
      defaultValue: 'UNKNOWN',
    },
    phone: {
      type: Sequelize.STRING(30),
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    city: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    state: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    country: {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: 'India',
    },
    postal_code: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    emergency_contact_name: {
      type: Sequelize.STRING(150),
      allowNull: true,
    },
    emergency_contact_phone: {
      type: Sequelize.STRING(30),
      allowNull: true,
    },
    emergency_contact_relation: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    allergies: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    medical_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

  // Strict tenant-scoped UHID uniqueness
  await queryInterface.addConstraint('patients', {
    fields: ['hospital_id', 'uhid'],
    type: 'unique',
    name: 'patients_hospital_id_uhid_unique',
  });

  // Core tenant query indexes
  await queryInterface.addIndex('patients', ['hospital_id'], {
    name: 'patients_hospital_id_idx',
  });

  await queryInterface.addIndex('patients', ['hospital_id', 'phone'], {
    name: 'patients_hospital_id_phone_idx',
  });

  await queryInterface.addIndex('patients', ['hospital_id', 'is_active'], {
    name: 'patients_hospital_id_is_active_idx',
  });

  await queryInterface.addIndex('patients', ['hospital_id', 'created_at'], {
    name: 'patients_hospital_id_created_at_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('patients');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_patients_gender";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_patients_blood_group";');
};
