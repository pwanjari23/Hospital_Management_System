/**
 * Migration: Create Clinical Encounters, Vitals, and Diagnoses Tables (Phase 7A)
 */
export const up = async (queryInterface, Sequelize) => {
  // 1. Create encounters table
  await queryInterface.createTable('encounters', {
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
    encounter_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    patient_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    appointment_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'appointments',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    doctor_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    department_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    encounter_type: {
      type: Sequelize.ENUM(
        'OPD',
        'FOLLOW_UP',
        'EECP_CONSULTATION',
        'EECP_SESSION',
        'EMERGENCY',
        'OTHER'
      ),
      allowNull: false,
      defaultValue: 'OPD',
    },
    status: {
      type: Sequelize.ENUM(
        'OPEN',
        'VITALS_PENDING',
        'READY_FOR_DOCTOR',
        'IN_CONSULTATION',
        'COMPLETED',
        'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'VITALS_PENDING',
    },
    chief_complaint: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    history_of_present_illness: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    past_medical_history: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    surgical_history: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    family_history: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    social_history: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    clinical_examination: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    assessment: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    treatment_plan: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    follow_up_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    follow_up_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    started_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    completed_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    updated_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
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

  // Indexes on encounters
  await queryInterface.addIndex('encounters', ['hospital_id', 'encounter_number'], {
    unique: true,
    name: 'encounters_hospital_encounter_number_unique',
  });
  await queryInterface.addIndex('encounters', ['hospital_id', 'patient_id'], {
    name: 'idx_encounters_hosp_patient',
  });
  await queryInterface.addIndex('encounters', ['hospital_id', 'doctor_id'], {
    name: 'idx_encounters_hosp_doctor',
  });
  await queryInterface.addIndex('encounters', ['hospital_id', 'appointment_id'], {
    name: 'idx_encounters_hosp_appointment',
  });
  await queryInterface.addIndex('encounters', ['hospital_id', 'status'], {
    name: 'idx_encounters_hosp_status',
  });
  await queryInterface.addIndex('encounters', ['hospital_id', 'created_at'], {
    name: 'idx_encounters_hosp_created_at',
  });

  // 2. Create vitals table
  await queryInterface.createTable('vitals', {
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
    encounter_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'encounters',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    patient_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    recorded_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    recorded_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    temperature: {
      type: Sequelize.DECIMAL(4, 1), // e.g. 98.6 (F)
      allowNull: true,
    },
    pulse_rate: {
      type: Sequelize.INTEGER, // e.g. 72 (bpm)
      allowNull: true,
    },
    respiratory_rate: {
      type: Sequelize.INTEGER, // e.g. 18 (breaths/min)
      allowNull: true,
    },
    systolic_bp: {
      type: Sequelize.INTEGER, // e.g. 120 (mmHg)
      allowNull: true,
    },
    diastolic_bp: {
      type: Sequelize.INTEGER, // e.g. 80 (mmHg)
      allowNull: true,
    },
    spo2: {
      type: Sequelize.INTEGER, // e.g. 98 (%)
      allowNull: true,
    },
    weight_kg: {
      type: Sequelize.DECIMAL(5, 2), // e.g. 68.50
      allowNull: true,
    },
    height_cm: {
      type: Sequelize.DECIMAL(5, 2), // e.g. 172.00
      allowNull: true,
    },
    bmi: {
      type: Sequelize.DECIMAL(4, 1), // e.g. 23.2
      allowNull: true,
    },
    blood_glucose: {
      type: Sequelize.INTEGER, // e.g. 110 (mg/dL)
      allowNull: true,
    },
    pain_score: {
      type: Sequelize.INTEGER, // 0 - 10
      allowNull: true,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
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

  // Indexes on vitals
  await queryInterface.addIndex('vitals', ['hospital_id', 'encounter_id'], {
    name: 'idx_vitals_hosp_encounter',
  });
  await queryInterface.addIndex('vitals', ['hospital_id', 'patient_id', 'recorded_at'], {
    name: 'idx_vitals_hosp_patient_recorded_at',
  });

  // 3. Create encounter_diagnoses table
  await queryInterface.createTable('encounter_diagnoses', {
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
    encounter_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'encounters',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    diagnosis_name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    diagnosis_code: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    diagnosis_type: {
      type: Sequelize.ENUM('PRIMARY', 'SECONDARY', 'DIFFERENTIAL'),
      allowNull: false,
      defaultValue: 'PRIMARY',
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    is_primary: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
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

  // Indexes on encounter_diagnoses
  await queryInterface.addIndex('encounter_diagnoses', ['hospital_id', 'encounter_id'], {
    name: 'idx_diagnoses_hosp_encounter',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('encounter_diagnoses');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_encounter_diagnoses_diagnosis_type";');

  await queryInterface.dropTable('vitals');

  await queryInterface.dropTable('encounters');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_encounters_encounter_type";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_encounters_status";');
};
