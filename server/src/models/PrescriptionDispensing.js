import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class PrescriptionDispensing extends Model {}

PrescriptionDispensing.init(
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
    prescriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'prescription_id',
      references: {
        model: 'prescriptions',
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
    pharmacistId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'pharmacist_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    dispensingNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'dispensing_number',
      validate: {
        notEmpty: { msg: 'Dispensing number is required' },
      },
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PARTIALLY_DISPENSED', 'FULLY_DISPENSED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
      validate: {
        isIn: {
          args: [['PENDING', 'PARTIALLY_DISPENSED', 'FULLY_DISPENSED', 'CANCELLED']],
          msg: 'Status must be PENDING, PARTIALLY_DISPENSED, FULLY_DISPENSED, or CANCELLED',
        },
      },
    },
    dispensedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'dispensed_at',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    modelName: 'PrescriptionDispensing',
    tableName: 'prescription_dispensings',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'dispensing_number'],
      },
      {
        fields: ['hospital_id', 'prescription_id'],
      },
      {
        fields: ['hospital_id', 'patient_id'],
      },
      {
        fields: ['hospital_id', 'status'],
      },
    ],
  }
);

export default PrescriptionDispensing;
