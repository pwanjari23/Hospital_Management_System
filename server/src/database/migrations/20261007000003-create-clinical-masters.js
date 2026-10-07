/**
 * Migration: Create Clinical Masters Tables (Phase 5 - Module 3)
 * Medicines, Investigations, Treatments, EECP Packages, Payment Modes
 */
export const up = async (queryInterface, Sequelize) => {
  // 1. Medicines Master
  await queryInterface.createTable('medicines', {
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
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    generic_name: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    category: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    strength: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    dosage_form: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    manufacturer: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    unit: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
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

  await queryInterface.addIndex('medicines', ['hospital_id', 'name'], {
    unique: true,
    name: 'medicines_hospital_id_name_unique',
  });
  await queryInterface.addIndex('medicines', ['hospital_id', 'status'], {
    name: 'medicines_hospital_id_status_idx',
  });
  await queryInterface.addIndex('medicines', ['hospital_id', 'category'], {
    name: 'medicines_hospital_id_category_idx',
  });

  // 2. Investigations Master
  await queryInterface.createTable('investigations', {
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
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    code: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    category: {
      type: Sequelize.STRING(100),
      allowNull: true,
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
    default_charge: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
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

  await queryInterface.addIndex('investigations', ['hospital_id', 'name'], {
    unique: true,
    name: 'investigations_hospital_id_name_unique',
  });
  await queryInterface.addIndex('investigations', ['hospital_id', 'status'], {
    name: 'investigations_hospital_id_status_idx',
  });

  // 3. Treatments Master
  await queryInterface.createTable('treatments', {
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
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    code: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    category: {
      type: Sequelize.STRING(100),
      allowNull: true,
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
    default_charge: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
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

  await queryInterface.addIndex('treatments', ['hospital_id', 'name'], {
    unique: true,
    name: 'treatments_hospital_id_name_unique',
  });
  await queryInterface.addIndex('treatments', ['hospital_id', 'status'], {
    name: 'treatments_hospital_id_status_idx',
  });

  // 4. EECP Packages Master
  await queryInterface.createTable('eecp_packages', {
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
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    number_of_sessions: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 35,
    },
    validity_period: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    package_price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    session_duration: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
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

  await queryInterface.addIndex('eecp_packages', ['hospital_id', 'name'], {
    unique: true,
    name: 'eecp_packages_hospital_id_name_unique',
  });
  await queryInterface.addIndex('eecp_packages', ['hospital_id', 'status'], {
    name: 'eecp_packages_hospital_id_status_idx',
  });

  // 5. Payment Modes Master
  await queryInterface.createTable('payment_modes', {
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
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    code: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
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

  await queryInterface.addIndex('payment_modes', ['hospital_id', 'name'], {
    unique: true,
    name: 'payment_modes_hospital_id_name_unique',
  });
  await queryInterface.addIndex('payment_modes', ['hospital_id', 'status'], {
    name: 'payment_modes_hospital_id_status_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('payment_modes');
  await queryInterface.dropTable('eecp_packages');
  await queryInterface.dropTable('treatments');
  await queryInterface.dropTable('investigations');
  await queryInterface.dropTable('medicines');

  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_medicines_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_investigations_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_treatments_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_eecp_packages_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payment_modes_status";');
};
