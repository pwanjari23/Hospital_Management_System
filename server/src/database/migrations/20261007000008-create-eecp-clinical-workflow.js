export async function up(queryInterface, Sequelize) {
  // 1. EECP Assessments Table
  await queryInterface.createTable('eecp_assessments', {
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
    encounter_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'encounters',
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
    doctor_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    indication: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    cardiac_history: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    previous_interventions: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    current_symptoms: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    functional_status: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    suitability_assessment: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'SUITABLE',
    },
    contraindication_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    recommended_sessions: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 35,
    },
    doctor_notes: {
      type: Sequelize.TEXT,
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
      defaultValue: Sequelize.fn('NOW'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
  });

  await queryInterface.addIndex('eecp_assessments', ['hospital_id', 'encounter_id'], {
    unique: true,
    name: 'eecp_assessments_hospital_id_encounter_id_unique',
  });
  await queryInterface.addIndex('eecp_assessments', ['hospital_id', 'patient_id'], {
    name: 'eecp_assessments_hospital_id_patient_id_idx',
  });
  await queryInterface.addIndex('eecp_assessments', ['hospital_id', 'doctor_id'], {
    name: 'eecp_assessments_hospital_id_doctor_id_idx',
  });

  // 2. EECP Treatment Courses Table
  await queryInterface.createTable('eecp_treatment_courses', {
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
    course_number: {
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
    initiating_encounter_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'encounters',
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
    package_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'eecp_packages',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    start_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    planned_sessions: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 35,
    },
    completed_sessions: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    treatment_plan: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    cancellation_reason: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    notes: {
      type: Sequelize.TEXT,
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
      defaultValue: Sequelize.fn('NOW'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
  });

  await queryInterface.addIndex('eecp_treatment_courses', ['hospital_id', 'course_number'], {
    unique: true,
    name: 'eecp_courses_hospital_id_course_number_unique',
  });
  await queryInterface.addIndex('eecp_treatment_courses', ['hospital_id', 'patient_id'], {
    name: 'eecp_courses_hospital_id_patient_id_idx',
  });
  await queryInterface.addIndex('eecp_treatment_courses', ['hospital_id', 'doctor_id'], {
    name: 'eecp_courses_hospital_id_doctor_id_idx',
  });
  await queryInterface.addIndex('eecp_treatment_courses', ['hospital_id', 'status'], {
    name: 'eecp_courses_hospital_id_status_idx',
  });

  // 3. EECP Sessions Table
  await queryInterface.createTable('eecp_sessions', {
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
    course_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'eecp_treatment_courses',
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
    encounter_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'encounters',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    staff_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    doctor_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    session_number: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    scheduled_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    started_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    completed_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    duration_minutes: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    pressure_applied: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'SCHEDULED',
    },
    pre_bp_systolic: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    pre_bp_diastolic: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    pre_pulse: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    pre_spo2: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    pre_weight_kg: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    },
    pre_session_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    trigger_mode: {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'ECG_R_WAVE',
    },
    patient_tolerance: {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'GOOD',
    },
    intra_session_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    adverse_event: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    adverse_event_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    interruption_reason: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    post_bp_systolic: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    post_bp_diastolic: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    post_pulse: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    post_spo2: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    post_session_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    cancellation_reason: {
      type: Sequelize.TEXT,
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
      defaultValue: Sequelize.fn('NOW'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
  });

  await queryInterface.addIndex('eecp_sessions', ['course_id', 'session_number'], {
    unique: true,
    name: 'eecp_sessions_course_id_session_number_unique',
  });
  await queryInterface.addIndex('eecp_sessions', ['hospital_id', 'scheduled_date'], {
    name: 'eecp_sessions_hospital_id_scheduled_date_idx',
  });
  await queryInterface.addIndex('eecp_sessions', ['hospital_id', 'status'], {
    name: 'eecp_sessions_hospital_id_status_idx',
  });
  await queryInterface.addIndex('eecp_sessions', ['hospital_id', 'patient_id'], {
    name: 'eecp_sessions_hospital_id_patient_id_idx',
  });

  // 4. EECP Session Readings Table (Intra-session monitoring)
  await queryInterface.createTable('eecp_session_readings', {
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
    session_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'eecp_sessions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    recorded_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
    systolic_bp: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    diastolic_bp: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    pulse_rate: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    spo2: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    treatment_pressure: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    patient_comfort: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    symptoms: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
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
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
  });

  await queryInterface.addIndex('eecp_session_readings', ['session_id', 'recorded_at'], {
    name: 'eecp_readings_session_id_recorded_at_idx',
  });
  await queryInterface.addIndex('eecp_session_readings', ['hospital_id'], {
    name: 'eecp_readings_hospital_id_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('eecp_session_readings');
  await queryInterface.dropTable('eecp_sessions');
  await queryInterface.dropTable('eecp_treatment_courses');
  await queryInterface.dropTable('eecp_assessments');
}
