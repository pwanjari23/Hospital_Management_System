export async function up(queryInterface, Sequelize) {
  // 1. Billing Services Master Table
  await queryInterface.createTable('billing_services', {
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
    service_code: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    service_name: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    category: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'OTHER',
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
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
    default_price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    tax_percentage: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.0,
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

  await queryInterface.addIndex('billing_services', ['hospital_id', 'service_code'], {
    unique: true,
    name: 'billing_services_hospital_id_service_code_unique',
  });
  await queryInterface.addIndex('billing_services', ['hospital_id', 'category'], {
    name: 'billing_services_hospital_id_category_idx',
  });
  await queryInterface.addIndex('billing_services', ['hospital_id', 'is_active'], {
    name: 'billing_services_hospital_id_is_active_idx',
  });

  // 2. Invoices Table
  await queryInterface.createTable('invoices', {
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
    invoice_number: {
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
    encounter_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'encounters',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
    invoice_date: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    subtotal: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    discount_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    tax_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    total_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    paid_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    due_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    status: {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    payment_status: {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'UNPAID',
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    cancellation_reason: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    cancelled_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    cancelled_by: {
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
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  await queryInterface.addIndex('invoices', ['hospital_id', 'invoice_number'], {
    unique: true,
    name: 'invoices_hospital_id_invoice_number_unique',
  });
  await queryInterface.addIndex('invoices', ['hospital_id', 'patient_id'], {
    name: 'invoices_hospital_id_patient_id_idx',
  });
  await queryInterface.addIndex('invoices', ['hospital_id', 'status'], {
    name: 'invoices_hospital_id_status_idx',
  });
  await queryInterface.addIndex('invoices', ['hospital_id', 'payment_status'], {
    name: 'invoices_hospital_id_payment_status_idx',
  });
  await queryInterface.addIndex('invoices', ['hospital_id', 'invoice_date'], {
    name: 'invoices_hospital_id_invoice_date_idx',
  });

  // 3. Invoice Items Table
  await queryInterface.createTable('invoice_items', {
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
    invoice_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'invoices',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    billing_service_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'billing_services',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    description: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    quantity: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.0,
    },
    unit_price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    discount_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    tax_percentage: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    tax_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    line_total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    source_type: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'OTHER',
    },
    source_id: {
      type: Sequelize.UUID,
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

  await queryInterface.addIndex('invoice_items', ['hospital_id', 'invoice_id'], {
    name: 'invoice_items_hospital_id_invoice_id_idx',
  });
  await queryInterface.addIndex('invoice_items', ['hospital_id', 'source_type', 'source_id'], {
    name: 'invoice_items_hospital_id_source_idx',
  });

  // 4. Payments Table
  await queryInterface.createTable('payments', {
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
    invoice_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'invoices',
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
    payment_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    payment_mode_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'payment_modes',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
    },
    transaction_reference: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    payment_date: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    status: {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'SUCCESS',
    },
    refunded_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
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

  await queryInterface.addIndex('payments', ['hospital_id', 'payment_number'], {
    unique: true,
    name: 'payments_hospital_id_payment_number_unique',
  });
  await queryInterface.addIndex('payments', ['hospital_id', 'invoice_id'], {
    name: 'payments_hospital_id_invoice_id_idx',
  });
  await queryInterface.addIndex('payments', ['hospital_id', 'patient_id'], {
    name: 'payments_hospital_id_patient_id_idx',
  });
  await queryInterface.addIndex('payments', ['hospital_id', 'payment_date'], {
    name: 'payments_hospital_id_payment_date_idx',
  });

  // 5. Receipts Table
  await queryInterface.createTable('receipts', {
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
    receipt_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    payment_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'payments',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    invoice_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'invoices',
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
    receipt_date: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
    },
    generated_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
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

  await queryInterface.addIndex('receipts', ['hospital_id', 'receipt_number'], {
    unique: true,
    name: 'receipts_hospital_id_receipt_number_unique',
  });
  await queryInterface.addIndex('receipts', ['hospital_id', 'payment_id'], {
    name: 'receipts_hospital_id_payment_id_idx',
  });
  await queryInterface.addIndex('receipts', ['hospital_id', 'invoice_id'], {
    name: 'receipts_hospital_id_invoice_id_idx',
  });
  await queryInterface.addIndex('receipts', ['hospital_id', 'patient_id'], {
    name: 'receipts_hospital_id_patient_id_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('receipts');
  await queryInterface.dropTable('payments');
  await queryInterface.dropTable('invoice_items');
  await queryInterface.dropTable('invoices');
  await queryInterface.dropTable('billing_services');
}
