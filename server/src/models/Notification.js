import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Notification extends Model {}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    hospitalId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'hospital_id',
      references: {
        model: 'hospitals',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    recipientUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'recipient_user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'patient_id',
      references: {
        model: 'patients',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: {
          args: [[
            'APPOINTMENT',
            'LAB_RESULT',
            'PRESCRIPTION',
            'PHARMACY',
            'BILLING',
            'PAYMENT',
            'IPD',
            'DISCHARGE',
            'EECP',
            'SYSTEM',
          ]],
          msg: 'Invalid notification type',
        },
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Notification title cannot be empty' },
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Notification message cannot be empty' },
      },
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'NORMAL',
      validate: {
        isIn: {
          args: [['LOW', 'NORMAL', 'HIGH', 'URGENT']],
          msg: 'Priority must be LOW, NORMAL, HIGH, or URGENT',
        },
      },
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'entity_id',
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read',
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'read_at',
    },
    channel: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'IN_APP',
      validate: {
        isIn: {
          args: [['IN_APP', 'EMAIL', 'SMS']],
          msg: 'Channel must be IN_APP, EMAIL, or SMS',
        },
      },
    },
    deliveryStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'SENT',
      field: 'delivery_status',
      validate: {
        isIn: {
          args: [['PENDING', 'SENT', 'FAILED']],
          msg: 'Delivery status must be PENDING, SENT, or FAILED',
        },
      },
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'failure_reason',
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'recipient_user_id'],
        name: 'notifications_hospital_id_recipient_user_id_idx',
      },
      {
        fields: ['hospital_id', 'recipient_user_id', 'is_read'],
        name: 'notifications_hospital_user_is_read_idx',
      },
      {
        fields: ['hospital_id', 'created_at'],
        name: 'notifications_hospital_id_created_at_idx',
      },
    ],
  }
);

export default Notification;
