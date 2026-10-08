export async function up(queryInterface, Sequelize) {
  // 1. Wards Table
  await queryInterface.createTable('wards', {
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
    department_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    ward_code: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    ward_name: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    ward_type: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'GENERAL',
    },
    floor: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    gender_policy: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'ANY',
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

  await queryInterface.addIndex('wards', ['hospital_id', 'ward_code'], {
    unique: true,
    name: 'wards_hospital_id_ward_code_unique',
  });
  await queryInterface.addIndex('wards', ['hospital_id', 'ward_type'], {
    name: 'wards_hospital_id_ward_type_idx',
  });
  await queryInterface.addIndex('wards', ['hospital_id', 'is_active'], {
    name: 'wards_hospital_id_is_active_idx',
  });

  // 2. Beds Table
  await queryInterface.createTable('beds', {
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
    ward_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'wards',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    bed_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    bed_type: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'STANDARD',
    },
    floor: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'AVAILABLE',
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

  await queryInterface.addIndex('beds', ['hospital_id', 'ward_id', 'bed_number'], {
    unique: true,
    name: 'beds_hospital_id_ward_id_bed_number_unique',
  });
  await queryInterface.addIndex('beds', ['hospital_id', 'status'], {
    name: 'beds_hospital_id_status_idx',
  });
  await queryInterface.addIndex('beds', ['hospital_id', 'ward_id', 'status'], {
    name: 'beds_hospital_id_ward_id_status_idx',
  });

  // 3. IPD Admissions Table
  await queryInterface.createTable('ipd_admissions', {
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
    admission_number: {
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
    admitting_doctor_id: {
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
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    ward_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'wards',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    bed_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'beds',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    admission_type: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'PLANNED',
    },
    admission_date: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    admission_time: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    reason_for_admission: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    provisional_diagnosis: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    referred_by: {
      type: Sequelize.STRING(150),
      allowNull: true,
    },
    emergency_case: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'ADMITTED',
    },
    expected_discharge_date: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    discharged_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    discharge_summary: {
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
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  await queryInterface.addIndex('ipd_admissions', ['hospital_id', 'admission_number'], {
    unique: true,
    name: 'ipd_admissions_hospital_id_admission_number_unique',
  });
  await queryInterface.addIndex('ipd_admissions', ['hospital_id', 'patient_id'], {
    name: 'ipd_admissions_hospital_id_patient_id_idx',
  });
  await queryInterface.addIndex('ipd_admissions', ['hospital_id', 'status'], {
    name: 'ipd_admissions_hospital_id_status_idx',
  });
  await queryInterface.addIndex('ipd_admissions', ['hospital_id', 'ward_id'], {
    name: 'ipd_admissions_hospital_id_ward_id_idx',
  });
  await queryInterface.addIndex('ipd_admissions', ['hospital_id', 'bed_id'], {
    name: 'ipd_admissions_hospital_id_bed_id_idx',
  });
  await queryInterface.addIndex('ipd_admissions', ['hospital_id', 'admitting_doctor_id'], {
    name: 'ipd_admissions_hospital_id_admitting_doctor_id_idx',
  });
  await queryInterface.addIndex('ipd_admissions', ['hospital_id', 'admission_date'], {
    name: 'ipd_admissions_hospital_id_admission_date_idx',
  });

  // 4. IPD Bed Transfers Table
  await queryInterface.createTable('ipd_bed_transfers', {
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
    from_ward_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'wards',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    from_bed_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'beds',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    to_ward_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'wards',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    to_bed_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'beds',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    transfer_reason: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    transferred_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    transferred_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

  await queryInterface.addIndex('ipd_bed_transfers', ['hospital_id', 'admission_id'], {
    name: 'ipd_bed_transfers_hospital_id_admission_id_idx',
  });
  await queryInterface.addIndex('ipd_bed_transfers', ['hospital_id', 'patient_id'], {
    name: 'ipd_bed_transfers_hospital_id_patient_id_idx',
  });
  await queryInterface.addIndex('ipd_bed_transfers', ['hospital_id', 'transferred_at'], {
    name: 'ipd_bed_transfers_hospital_id_transferred_at_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('ipd_bed_transfers');
  await queryInterface.dropTable('ipd_admissions');
  await queryInterface.dropTable('beds');
  await queryInterface.dropTable('wards');
}
