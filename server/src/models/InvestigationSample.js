import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class InvestigationSample extends Model {}

InvestigationSample.init(
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
    investigationOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'investigation_order_id',
      references: {
        model: 'investigation_orders',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Investigation Order ID is required' },
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
    sampleNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'sample_number',
      validate: {
        notEmpty: { msg: 'Sample number is required' },
      },
    },
    sampleType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Blood',
      field: 'sample_type',
    },
    status: {
      type: DataTypes.ENUM(
        'PENDING_COLLECTION',
        'COLLECTED',
        'RECEIVED',
        'REJECTED',
        'PROCESSING',
        'COMPLETED'
      ),
      allowNull: false,
      defaultValue: 'PENDING_COLLECTION',
      validate: {
        isIn: {
          args: [
            [
              'PENDING_COLLECTION',
              'COLLECTED',
              'RECEIVED',
              'REJECTED',
              'PROCESSING',
              'COMPLETED',
            ],
          ],
          msg: 'Invalid sample status',
        },
      },
    },
    collectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'collected_at',
    },
    collectedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'collected_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'received_at',
    },
    receivedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'received_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
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
    modelName: 'InvestigationSample',
    tableName: 'investigation_samples',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'sample_number'],
        name: 'inv_samples_hosp_sample_num_unique',
      },
      {
        fields: ['hospital_id', 'investigation_order_id'],
        name: 'inv_samples_hosp_order_idx',
      },
      {
        fields: ['hospital_id', 'patient_id'],
        name: 'inv_samples_hosp_patient_idx',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'inv_samples_hosp_status_idx',
      },
    ],
  }
);

export default InvestigationSample;
