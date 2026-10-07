/**
 * Migration: Create Doctor Schedules, Leaves, and Appointments Tables (Phase 6)
 */
export const up = async (queryInterface, Sequelize) => {
  // 1. Create doctor_schedules table
  await queryInterface.createTable('doctor_schedules', {
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
    doctor_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    day_of_week: {
      type: Sequelize.ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
      allowNull: false,
    },
    start_time: {
      type: Sequelize.STRING(8), // e.g. "09:00" or "09:00:00"
      allowNull: false,
    },
    end_time: {
      type: Sequelize.STRING(8), // e.g. "17:00" or "17:00:00"
      allowNull: false,
    },
    break_start_time: {
      type: Sequelize.STRING(8),
      allowNull: true,
    },
    break_end_time: {
      type: Sequelize.STRING(8),
      allowNull: true,
    },
    slot_duration_minutes: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    max_appointments_per_slot: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    consultation_type: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'OPD Consultation',
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

  // Indexes on doctor_schedules
  await queryInterface.addIndex('doctor_schedules', ['hospital_id', 'doctor_id', 'day_of_week'], {
    name: 'idx_doctor_schedules_hosp_doc_day',
  });
  await queryInterface.addIndex('doctor_schedules', ['hospital_id', 'is_active'], {
    name: 'idx_doctor_schedules_hosp_active',
  });

  // 2. Create doctor_leaves table
  await queryInterface.createTable('doctor_leaves', {
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
    doctor_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    start_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    reason: {
      type: Sequelize.STRING(100),
      allowNull: false,
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

  // Indexes on doctor_leaves
  await queryInterface.addIndex('doctor_leaves', ['hospital_id', 'doctor_id', 'start_date', 'end_date'], {
    name: 'idx_doctor_leaves_hosp_doc_dates',
  });
  await queryInterface.addIndex('doctor_leaves', ['hospital_id', 'is_active'], {
    name: 'idx_doctor_leaves_hosp_active',
  });

  // 3. Create appointments table
  await queryInterface.createTable('appointments', {
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
    appointment_number: {
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
    appointment_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    start_time: {
      type: Sequelize.STRING(8),
      allowNull: false,
    },
    end_time: {
      type: Sequelize.STRING(8),
      allowNull: false,
    },
    appointment_type: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'OPD Consultation',
    },
    status: {
      type: Sequelize.ENUM(
        'SCHEDULED',
        'CONFIRMED',
        'CHECKED_IN',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW',
        'RESCHEDULED'
      ),
      allowNull: false,
      defaultValue: 'SCHEDULED',
    },
    reason: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    consultation_fee: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    payment_status: {
      type: Sequelize.ENUM('PENDING', 'PAID', 'EXEMPT', 'PARTIAL'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    booked_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    cancellation_reason: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    cancelled_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    checked_in_at: {
      type: Sequelize.DATE,
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

  // Indexes on appointments
  await queryInterface.addIndex('appointments', ['hospital_id', 'appointment_number'], {
    unique: true,
    name: 'appointments_hospital_appointment_number_unique',
  });
  await queryInterface.addIndex('appointments', ['hospital_id', 'appointment_date'], {
    name: 'idx_appointments_hosp_date',
  });
  await queryInterface.addIndex('appointments', ['hospital_id', 'doctor_id', 'appointment_date'], {
    name: 'idx_appointments_hosp_doc_date',
  });
  await queryInterface.addIndex('appointments', ['hospital_id', 'patient_id'], {
    name: 'idx_appointments_hosp_patient',
  });
  await queryInterface.addIndex('appointments', ['hospital_id', 'status'], {
    name: 'idx_appointments_hosp_status',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('appointments');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_appointments_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_appointments_payment_status";');

  await queryInterface.dropTable('doctor_leaves');

  await queryInterface.dropTable('doctor_schedules');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_doctor_schedules_day_of_week";');
};
