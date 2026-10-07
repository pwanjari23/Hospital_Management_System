export async function up(queryInterface, Sequelize) {
  // 1. Prescriptions Table
  await queryInterface.createTable('prescriptions', {
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
    prescription_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
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
    status: {
      type: Sequelize.ENUM('DRAFT', 'FINALIZED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    prescribed_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
    notes: {
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

  // Indexes for prescriptions
  await queryInterface.addIndex('prescriptions', ['hospital_id', 'prescription_number'], {
    unique: true,
    name: 'prescriptions_hospital_id_prescription_number_unique',
  });
  await queryInterface.addIndex('prescriptions', ['hospital_id', 'encounter_id'], {
    name: 'prescriptions_hospital_id_encounter_id_idx',
  });
  await queryInterface.addIndex('prescriptions', ['hospital_id', 'patient_id'], {
    name: 'prescriptions_hospital_id_patient_id_idx',
  });
  await queryInterface.addIndex('prescriptions', ['hospital_id', 'doctor_id'], {
    name: 'prescriptions_hospital_id_doctor_id_idx',
  });
  await queryInterface.addIndex('prescriptions', ['hospital_id', 'status'], {
    name: 'prescriptions_hospital_id_status_idx',
  });

  // 2. Prescription Items Table
  await queryInterface.createTable('prescription_items', {
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
    prescription_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'prescriptions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    medicine_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'medicines',
        key: 'id',
      },
      onDelete: 'RESTRICT',
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
      allowNull: true,
      defaultValue: 'ORAL',
    },
    duration_value: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    duration_unit: {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'DAYS',
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    food_instruction: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    instructions: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    sort_order: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
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

  await queryInterface.addIndex('prescription_items', ['hospital_id', 'prescription_id'], {
    name: 'prescription_items_hospital_id_prescription_id_idx',
  });
  await queryInterface.addIndex('prescription_items', ['hospital_id', 'medicine_id'], {
    name: 'prescription_items_hospital_id_medicine_id_idx',
  });

  // 3. Investigation Orders Table
  await queryInterface.createTable('investigation_orders', {
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
    order_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
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
    investigation_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'investigations',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    investigation_name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    priority: {
      type: Sequelize.ENUM('ROUTINE', 'URGENT'),
      allowNull: false,
      defaultValue: 'ROUTINE',
    },
    clinical_indication: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('ORDERED', 'FINALIZED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ORDERED',
    },
    ordered_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
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

  await queryInterface.addIndex('investigation_orders', ['hospital_id', 'order_number'], {
    unique: true,
    name: 'investigation_orders_hospital_id_order_number_unique',
  });
  await queryInterface.addIndex('investigation_orders', ['hospital_id', 'encounter_id'], {
    name: 'investigation_orders_hospital_id_encounter_id_idx',
  });
  await queryInterface.addIndex('investigation_orders', ['hospital_id', 'patient_id'], {
    name: 'investigation_orders_hospital_id_patient_id_idx',
  });
  await queryInterface.addIndex('investigation_orders', ['hospital_id', 'doctor_id'], {
    name: 'investigation_orders_hospital_id_doctor_id_idx',
  });
  await queryInterface.addIndex('investigation_orders', ['hospital_id', 'investigation_id'], {
    name: 'investigation_orders_hospital_id_investigation_id_idx',
  });
  await queryInterface.addIndex('investigation_orders', ['hospital_id', 'status'], {
    name: 'investigation_orders_hospital_id_status_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('investigation_orders');
  await queryInterface.dropTable('prescription_items');
  await queryInterface.dropTable('prescriptions');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_prescriptions_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_investigation_orders_priority";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_investigation_orders_status";');
}
