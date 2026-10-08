export const up = async (queryInterface, Sequelize) => {
  // 1. Extend encounters table with ipd_admission_id and add 'IPD' to encounter_type enum
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      ALTER TYPE "enum_encounters_encounter_type" ADD VALUE IF NOT EXISTS 'IPD';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await queryInterface.addColumn('encounters', 'ipd_admission_id', {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: 'ipd_admissions',
      key: 'id',
    },
    onDelete: 'SET NULL',
  });

  await queryInterface.addIndex('encounters', ['hospital_id', 'ipd_admission_id'], {
    name: 'encounters_hospital_id_ipd_admission_id_idx',
  });

  // 2. Extend vitals table with ipd_admission_id and allow encounter_id to be nullable for direct IPD vitals
  await queryInterface.addColumn('vitals', 'ipd_admission_id', {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: 'ipd_admissions',
      key: 'id',
    },
    onDelete: 'SET NULL',
  });

  await queryInterface.sequelize.query(`
    ALTER TABLE "vitals" ALTER COLUMN "encounter_id" DROP NOT NULL;
  `);

  await queryInterface.addIndex('vitals', ['hospital_id', 'ipd_admission_id'], {
    name: 'vitals_hospital_id_ipd_admission_id_idx',
  });

  // 3. Create ipd_progress_notes table (Doctor Daily Progress)
  await queryInterface.createTable('ipd_progress_notes', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
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
    admission_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'ipd_admissions',
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
    doctor_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    progress_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    progress_time: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    subjective: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    objective: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    assessment: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    plan: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('DRAFT', 'FINALIZED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    finalized_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    finalized_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  await queryInterface.addIndex('ipd_progress_notes', ['hospital_id', 'admission_id'], {
    name: 'ipd_progress_notes_hosp_adm_idx',
  });
  await queryInterface.addIndex('ipd_progress_notes', ['hospital_id', 'patient_id'], {
    name: 'ipd_progress_notes_hosp_patient_idx',
  });
  await queryInterface.addIndex('ipd_progress_notes', ['hospital_id', 'doctor_id'], {
    name: 'ipd_progress_notes_hosp_doctor_idx',
  });
  await queryInterface.addIndex('ipd_progress_notes', ['hospital_id', 'progress_date'], {
    name: 'ipd_progress_notes_hosp_date_idx',
  });
  await queryInterface.addIndex('ipd_progress_notes', ['hospital_id', 'status'], {
    name: 'ipd_progress_notes_hosp_status_idx',
  });

  // 4. Create ipd_nursing_notes table
  await queryInterface.createTable('ipd_nursing_notes', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
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
    admission_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'ipd_admissions',
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
    nurse_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    note_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    note_time: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    observations: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    pain_scale: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    mobility: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    diet: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    intake_output: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    nursing_interventions: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    safety_observations: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    doctor_notification_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('DRAFT', 'FINALIZED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    finalized_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    finalized_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  await queryInterface.addIndex('ipd_nursing_notes', ['hospital_id', 'admission_id'], {
    name: 'ipd_nursing_notes_hosp_adm_idx',
  });
  await queryInterface.addIndex('ipd_nursing_notes', ['hospital_id', 'patient_id'], {
    name: 'ipd_nursing_notes_hosp_patient_idx',
  });
  await queryInterface.addIndex('ipd_nursing_notes', ['hospital_id', 'nurse_id'], {
    name: 'ipd_nursing_notes_hosp_nurse_idx',
  });
  await queryInterface.addIndex('ipd_nursing_notes', ['hospital_id', 'note_date'], {
    name: 'ipd_nursing_notes_hosp_date_idx',
  });
  await queryInterface.addIndex('ipd_nursing_notes', ['hospital_id', 'status'], {
    name: 'ipd_nursing_notes_hosp_status_idx',
  });

  // 5. Create discharge_summaries table
  await queryInterface.createTable('discharge_summaries', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
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
    admission_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'ipd_admissions',
        key: 'id',
      },
      onDelete: 'RESTRICT',
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
    discharge_summary_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    discharging_doctor_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    discharge_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    discharge_time: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    reason_for_admission: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    provisional_diagnosis: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    final_diagnosis: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    hospital_course: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    significant_findings: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    investigation_summary: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    treatment_given: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    complications: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    condition_at_discharge: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    disposition: {
      type: Sequelize.ENUM('HOME', 'TRANSFERRED', 'LAMA', 'ABSCONDED', 'REFERRED', 'DECEASED'),
      allowNull: false,
      defaultValue: 'HOME',
    },
    discharge_instructions: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    diet_instructions: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    activity_instructions: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    warning_signs: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    follow_up_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    follow_up_instructions: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    doctor_remarks: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('DRAFT', 'FINALIZED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    finalized_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    finalized_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  await queryInterface.addIndex('discharge_summaries', ['hospital_id', 'admission_id'], {
    name: 'discharge_summaries_hosp_admission_unique',
    unique: true,
  });
  await queryInterface.addIndex('discharge_summaries', ['hospital_id', 'discharge_summary_number'], {
    name: 'discharge_summaries_hosp_number_unique',
    unique: true,
  });
  await queryInterface.addIndex('discharge_summaries', ['hospital_id', 'patient_id'], {
    name: 'discharge_summaries_hosp_patient_idx',
  });
  await queryInterface.addIndex('discharge_summaries', ['hospital_id', 'discharging_doctor_id'], {
    name: 'discharge_summaries_hosp_doctor_idx',
  });
  await queryInterface.addIndex('discharge_summaries', ['hospital_id', 'status'], {
    name: 'discharge_summaries_hosp_status_idx',
  });

  // 6. Create discharge_medications table
  await queryInterface.createTable('discharge_medications', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
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
    discharge_summary_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'discharge_summaries',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    medicine_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'medicines',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    medicine_name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    dosage: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    frequency: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    route: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'ORAL',
    },
    duration: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    instructions: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    order_index: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  await queryInterface.addIndex('discharge_medications', ['hospital_id', 'discharge_summary_id'], {
    name: 'discharge_medications_hosp_summary_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('discharge_medications');
  await queryInterface.dropTable('discharge_summaries');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_discharge_summaries_disposition";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_discharge_summaries_status";');

  await queryInterface.dropTable('ipd_nursing_notes');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ipd_nursing_notes_status";');

  await queryInterface.dropTable('ipd_progress_notes');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ipd_progress_notes_status";');

  await queryInterface.removeColumn('vitals', 'ipd_admission_id');
  await queryInterface.removeColumn('encounters', 'ipd_admission_id');
};
