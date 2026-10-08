export async function up(queryInterface, Sequelize) {
  // 1. Investigation Samples Table
  await queryInterface.createTable('investigation_samples', {
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
    investigation_order_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'investigation_orders',
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
    sample_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    sample_type: {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: 'Blood',
    },
    status: {
      type: Sequelize.ENUM(
        'PENDING_COLLECTION',
        'COLLECTED',
        'RECEIVED',
        'REJECTED',
        'PROCESSING',
        'COMPLETED'
      ),
      allowNull: false,
      defaultValue: 'PENDING_COLLECTION',
    },
    collected_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    collected_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    received_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    received_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    rejection_reason: {
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

  await queryInterface.addIndex('investigation_samples', ['hospital_id', 'sample_number'], {
    unique: true,
    name: 'inv_samples_hosp_sample_num_unique',
  });
  await queryInterface.addIndex('investigation_samples', ['hospital_id', 'investigation_order_id'], {
    name: 'inv_samples_hosp_order_idx',
  });
  await queryInterface.addIndex('investigation_samples', ['hospital_id', 'patient_id'], {
    name: 'inv_samples_hosp_patient_idx',
  });
  await queryInterface.addIndex('investigation_samples', ['hospital_id', 'status'], {
    name: 'inv_samples_hosp_status_idx',
  });

  // 2. Investigation Results Table
  await queryInterface.createTable('investigation_results', {
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
    investigation_order_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'investigation_orders',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    investigation_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'investigations',
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
      allowNull: false,
      references: {
        model: 'encounters',
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
    sample_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'investigation_samples',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    result_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM(
        'PENDING',
        'IN_PROGRESS',
        'RESULT_ENTERED',
        'VERIFIED',
        'FINALIZED',
        'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    result_type: {
      type: Sequelize.ENUM('QUANTITATIVE', 'QUALITATIVE', 'TEXT'),
      allowNull: false,
      defaultValue: 'QUANTITATIVE',
    },
    result_value: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    result_unit: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    reference_range: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    abnormal_flag: {
      type: Sequelize.ENUM('NORMAL', 'LOW', 'HIGH', 'CRITICAL', 'ABNORMAL'),
      allowNull: false,
      defaultValue: 'NORMAL',
    },
    interpretation: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    observations: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    technician_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    investigation_name_snapshot: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    normal_range_snapshot: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    unit_snapshot: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    entered_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    entered_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    verified_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    verified_at: {
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
    finalized_at: {
      type: Sequelize.DATE,
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

  await queryInterface.addIndex('investigation_results', ['hospital_id', 'result_number'], {
    unique: true,
    name: 'inv_results_hosp_result_num_unique',
  });
  await queryInterface.addIndex('investigation_results', ['hospital_id', 'investigation_order_id'], {
    unique: true,
    name: 'inv_results_hosp_order_unique',
  });
  await queryInterface.addIndex('investigation_results', ['hospital_id', 'patient_id'], {
    name: 'inv_results_hosp_patient_idx',
  });
  await queryInterface.addIndex('investigation_results', ['hospital_id', 'encounter_id'], {
    name: 'inv_results_hosp_encounter_idx',
  });
  await queryInterface.addIndex('investigation_results', ['hospital_id', 'doctor_id'], {
    name: 'inv_results_hosp_doctor_idx',
  });
  await queryInterface.addIndex('investigation_results', ['hospital_id', 'status'], {
    name: 'inv_results_hosp_status_idx',
  });
  await queryInterface.addIndex('investigation_results', ['hospital_id', 'abnormal_flag'], {
    name: 'inv_results_hosp_abnormal_flag_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('investigation_results');
  await queryInterface.dropTable('investigation_samples');

  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_investigation_samples_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_investigation_results_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_investigation_results_result_type";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_investigation_results_abnormal_flag";');
}
