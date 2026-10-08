/**
 * Migration: Create Notifications Table
 * Phase 11: In-App, Email/SMS, Role-targeted, Tenant-isolated Notifications
 */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('notifications', {
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
      onDelete: 'CASCADE',
    },
    recipient_user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    patient_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'patients',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    type: {
      type: Sequelize.STRING(50),
      allowNull: false,
      comment: 'APPOINTMENT, LAB_RESULT, PRESCRIPTION, PHARMACY, BILLING, PAYMENT, IPD, DISCHARGE, EECP, SYSTEM',
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    priority: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'NORMAL',
      comment: 'LOW, NORMAL, HIGH, URGENT',
    },
    entity_type: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'APPOINTMENT, INVOICE, PAYMENT, LAB_ORDER, IPD_ADMISSION, PRESCRIPTION, EECP_COURSE, etc.',
    },
    entity_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    is_read: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    read_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    channel: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'IN_APP',
      comment: 'IN_APP, EMAIL, SMS',
    },
    delivery_status: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'SENT',
      comment: 'PENDING, SENT, FAILED',
    },
    failure_reason: {
      type: Sequelize.TEXT,
      allowNull: true,
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

  // Performance Indexes
  await queryInterface.addIndex('notifications', ['hospital_id', 'recipient_user_id'], {
    name: 'notifications_hospital_id_recipient_user_id_idx',
  });

  await queryInterface.addIndex('notifications', ['hospital_id', 'recipient_user_id', 'is_read'], {
    name: 'notifications_hospital_user_is_read_idx',
  });

  await queryInterface.addIndex('notifications', ['hospital_id', 'created_at'], {
    name: 'notifications_hospital_id_created_at_idx',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('notifications');
};
