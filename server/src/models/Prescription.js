import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Prescription extends Model {}

Prescription.init(
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
    prescriptionNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'prescription_number',
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
    status: {
      type: DataTypes.ENUM('DRAFT', 'FINALIZED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
      validate: {
        isIn: {
          args: [['DRAFT', 'FINALIZED', 'CANCELLED']],
          msg: 'Status must be DRAFT, FINALIZED, or CANCELLED',
        },
      },
    },
    prescribedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'prescribed_at',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    modelName: 'Prescription',
    tableName: 'prescriptions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'prescription_number'],
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
        fields: ['hospital_id', 'status'],
      },
    ],
  }
);

export default Prescription;
