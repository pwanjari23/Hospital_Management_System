import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class IpdBedTransfer extends Model {}

IpdBedTransfer.init(
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
      validate: {
        notNull: { msg: 'Hospital ID is required' },
      },
    },
    admissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'admission_id',
      references: {
        model: 'ipd_admissions',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Admission ID is required' },
      },
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
      validate: {
        notNull: { msg: 'Patient ID is required' },
      },
    },
    fromWardId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'from_ward_id',
      references: {
        model: 'wards',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'From Ward ID is required' },
      },
    },
    fromBedId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'from_bed_id',
      references: {
        model: 'beds',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'From Bed ID is required' },
      },
    },
    toWardId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'to_ward_id',
      references: {
        model: 'wards',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'To Ward ID is required' },
      },
    },
    toBedId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'to_bed_id',
      references: {
        model: 'beds',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'To Bed ID is required' },
      },
    },
    transferReason: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'transfer_reason',
      validate: {
        notEmpty: { msg: 'Transfer reason is required' },
      },
    },
    transferredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'transferred_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    transferredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'transferred_at',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'IpdBedTransfer',
    tableName: 'ipd_bed_transfers',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'admission_id'],
        name: 'ipd_bed_transfers_hospital_id_admission_id_idx',
      },
      {
        fields: ['hospital_id', 'patient_id'],
        name: 'ipd_bed_transfers_hospital_id_patient_id_idx',
      },
      {
        fields: ['hospital_id', 'transferred_at'],
        name: 'ipd_bed_transfers_hospital_id_transferred_at_idx',
      },
    ],
  }
);

export default IpdBedTransfer;
