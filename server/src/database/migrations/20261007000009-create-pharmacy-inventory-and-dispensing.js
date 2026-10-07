export async function up(queryInterface, Sequelize) {
  // 1. Medicine Batches Table
  await queryInterface.createTable('medicine_batches', {
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
    medicine_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'medicines',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    batch_number: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    manufacturing_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    expiry_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    purchase_rate: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    },
    selling_rate: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    },
    quantity_received: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    quantity_available: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reorder_level: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
    storage_location: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'EXPIRED', 'BLOCKED', 'DEPLETED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
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

  await queryInterface.addIndex('medicine_batches', ['hospital_id', 'medicine_id', 'batch_number'], {
    unique: true,
    name: 'medicine_batches_hosp_med_batch_unique',
  });
  await queryInterface.addIndex('medicine_batches', ['hospital_id', 'expiry_date'], {
    name: 'medicine_batches_hosp_expiry_idx',
  });
  await queryInterface.addIndex('medicine_batches', ['hospital_id', 'status'], {
    name: 'medicine_batches_hosp_status_idx',
  });
  await queryInterface.addIndex('medicine_batches', ['medicine_id', 'status'], {
    name: 'medicine_batches_med_status_idx',
  });

  // 2. Pharmacy Stock Transactions Ledger
  await queryInterface.createTable('pharmacy_stock_transactions', {
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
    medicine_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'medicines',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    batch_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'medicine_batches',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    transaction_type: {
      type: Sequelize.ENUM('STOCK_IN', 'DISPENSE', 'RETURN', 'ADJUSTMENT', 'EXPIRED', 'DAMAGED'),
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    reference_type: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    reference_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    reason: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    performed_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    transaction_date: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
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

  await queryInterface.addIndex('pharmacy_stock_transactions', ['hospital_id', 'batch_id'], {
    name: 'pharmacy_stock_tx_hosp_batch_idx',
  });
  await queryInterface.addIndex('pharmacy_stock_transactions', ['hospital_id', 'medicine_id'], {
    name: 'pharmacy_stock_tx_hosp_med_idx',
  });
  await queryInterface.addIndex('pharmacy_stock_transactions', ['hospital_id', 'transaction_type'], {
    name: 'pharmacy_stock_tx_hosp_type_idx',
  });
  await queryInterface.addIndex('pharmacy_stock_transactions', ['hospital_id', 'transaction_date'], {
    name: 'pharmacy_stock_tx_hosp_date_idx',
  });

  // 3. Prescription Dispensings Table
  await queryInterface.createTable('prescription_dispensings', {
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
    pharmacist_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    dispensing_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('PENDING', 'PARTIALLY_DISPENSED', 'FULLY_DISPENSED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    dispensed_at: {
      type: Sequelize.DATE,
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

  await queryInterface.addIndex('prescription_dispensings', ['hospital_id', 'dispensing_number'], {
    unique: true,
    name: 'prescription_dispensings_hosp_num_unique',
  });
  await queryInterface.addIndex('prescription_dispensings', ['hospital_id', 'prescription_id'], {
    name: 'prescription_dispensings_hosp_rx_idx',
  });
  await queryInterface.addIndex('prescription_dispensings', ['hospital_id', 'patient_id'], {
    name: 'prescription_dispensings_hosp_patient_idx',
  });
  await queryInterface.addIndex('prescription_dispensings', ['hospital_id', 'status'], {
    name: 'prescription_dispensings_hosp_status_idx',
  });

  // 4. Prescription Dispensing Items Table
  await queryInterface.createTable('prescription_dispensing_items', {
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
    dispensing_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'prescription_dispensings',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    prescription_item_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'prescription_items',
        key: 'id',
      },
      onDelete: 'RESTRICT',
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
    batch_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'medicine_batches',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    prescribed_quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    dispensed_quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
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

  await queryInterface.addIndex('prescription_dispensing_items', ['hospital_id', 'dispensing_id'], {
    name: 'prescription_disp_items_hosp_disp_idx',
  });
  await queryInterface.addIndex('prescription_dispensing_items', ['hospital_id', 'prescription_item_id'], {
    name: 'prescription_disp_items_hosp_rx_item_idx',
  });
  await queryInterface.addIndex('prescription_dispensing_items', ['hospital_id', 'batch_id'], {
    name: 'prescription_disp_items_hosp_batch_idx',
  });
  await queryInterface.addIndex('prescription_dispensing_items', ['hospital_id', 'medicine_id'], {
    name: 'prescription_disp_items_hosp_med_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('prescription_dispensing_items');
  await queryInterface.dropTable('prescription_dispensings');
  await queryInterface.dropTable('pharmacy_stock_transactions');
  await queryInterface.dropTable('medicine_batches');

  // Clean up Enums
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_medicine_batches_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pharmacy_stock_transactions_transaction_type";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_prescription_dispensings_status";');
}
