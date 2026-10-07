import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class InvestigationOrder extends Model {}

InvestigationOrder.init(
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
      onDelete: 'RESTRICT',
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'order_number',
    },
    encounterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'encounter_id',
      references: {
        model: 'encounters',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'patient_id',
      references: {
        model: 'patients',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'doctor_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    investigationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'investigation_id',
      references: {
        model: 'investigations',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    investigationName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'investigation_name',
    },
    priority: {
      type: DataTypes.ENUM('ROUTINE', 'URGENT'),
      allowNull: false,
      defaultValue: 'ROUTINE',
      validate: {
        isIn: {
          args: [['ROUTINE', 'URGENT']],
          msg: 'Priority must be ROUTINE or URGENT',
        },
      },
    },
    clinicalIndication: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'clinical_indication',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ORDERED', 'FINALIZED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ORDERED',
      validate: {
        isIn: {
          args: [['ORDERED', 'FINALIZED', 'CANCELLED']],
          msg: 'Status must be ORDERED, FINALIZED, or CANCELLED',
        },
      },
    },
    orderedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'ordered_at',
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cancellation_reason',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    modelName: 'InvestigationOrder',
    tableName: 'investigation_orders',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'order_number'],
      },
      {
        fields: ['hospital_id', 'encounter_id'],
      },
      {
        fields: ['hospital_id', 'patient_id'],
      },
      {
        fields: ['hospital_id', 'doctor_id'],
      },
      {
        fields: ['hospital_id', 'investigation_id'],
      },
      {
        fields: ['hospital_id', 'status'],
      },
    ],
  }
);

export default InvestigationOrder;
