import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class InvestigationResult extends Model {}

InvestigationResult.init(
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
    investigationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'investigation_id',
      references: {
        model: 'investigations',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Investigation ID is required' },
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
    encounterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'encounter_id',
      references: {
        model: 'encounters',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Encounter ID is required' },
      },
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
      validate: {
        notNull: { msg: 'Doctor ID is required' },
      },
    },
    sampleId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'sample_id',
      references: {
        model: 'investigation_samples',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    resultNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'result_number',
      validate: {
        notEmpty: { msg: 'Result number is required' },
      },
    },
    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'IN_PROGRESS',
        'RESULT_ENTERED',
        'VERIFIED',
        'FINALIZED',
        'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'PENDING',
      validate: {
        isIn: {
          args: [
            [
              'PENDING',
              'IN_PROGRESS',
              'RESULT_ENTERED',
              'VERIFIED',
              'FINALIZED',
              'CANCELLED',
            ],
          ],
          msg: 'Invalid result status',
        },
      },
    },
    resultType: {
      type: DataTypes.ENUM('QUANTITATIVE', 'QUALITATIVE', 'TEXT'),
      allowNull: false,
      defaultValue: 'QUANTITATIVE',
      field: 'result_type',
      validate: {
        isIn: {
          args: [['QUANTITATIVE', 'QUALITATIVE', 'TEXT']],
          msg: 'Result type must be QUANTITATIVE, QUALITATIVE, or TEXT',
        },
      },
    },
    resultValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'result_value',
    },
    resultUnit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'result_unit',
    },
    referenceRange: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'reference_range',
    },
    abnormalFlag: {
      type: DataTypes.ENUM('NORMAL', 'LOW', 'HIGH', 'CRITICAL', 'ABNORMAL'),
      allowNull: false,
      defaultValue: 'NORMAL',
      field: 'abnormal_flag',
      validate: {
        isIn: {
          args: [['NORMAL', 'LOW', 'HIGH', 'CRITICAL', 'ABNORMAL']],
          msg: 'Abnormal flag must be NORMAL, LOW, HIGH, CRITICAL, or ABNORMAL',
        },
      },
    },
    interpretation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    observations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    technicianNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'technician_notes',
    },
    investigationNameSnapshot: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'investigation_name_snapshot',
    },
    normalRangeSnapshot: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'normal_range_snapshot',
    },
    unitSnapshot: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'unit_snapshot',
    },
    enteredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'entered_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    enteredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'entered_at',
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'verified_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at',
    },
    finalizedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'finalized_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    finalizedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'finalized_at',
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
    modelName: 'InvestigationResult',
    tableName: 'investigation_results',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'result_number'],
        name: 'inv_results_hosp_result_num_unique',
      },
      {
        unique: true,
        fields: ['hospital_id', 'investigation_order_id'],
        name: 'inv_results_hosp_order_unique',
      },
      {
        fields: ['hospital_id', 'patient_id'],
        name: 'inv_results_hosp_patient_idx',
      },
      {
        fields: ['hospital_id', 'encounter_id'],
        name: 'inv_results_hosp_encounter_idx',
      },
      {
        fields: ['hospital_id', 'doctor_id'],
        name: 'inv_results_hosp_doctor_idx',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'inv_results_hosp_status_idx',
      },
      {
        fields: ['hospital_id', 'abnormal_flag'],
        name: 'inv_results_hosp_abnormal_flag_idx',
      },
    ],
  }
);

export default InvestigationResult;
