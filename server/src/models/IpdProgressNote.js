import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class IpdProgressNote extends Model {}

IpdProgressNote.init(
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
      onDelete: 'CASCADE',
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
    progressDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'progress_date',
    },
    progressTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'progress_time',
    },
    subjective: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    objective: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assessment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    plan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'FINALIZED'),
      allowNull: false,
      defaultValue: 'DRAFT',
      validate: {
        isIn: {
          args: [['DRAFT', 'FINALIZED']],
          msg: 'Invalid progress note status',
        },
      },
    },
    finalizedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'finalized_at',
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
    modelName: 'IpdProgressNote',
    tableName: 'ipd_progress_notes',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'admission_id'],
        name: 'ipd_progress_notes_hosp_adm_idx',
      },
      {
        fields: ['hospital_id', 'patient_id'],
        name: 'ipd_progress_notes_hosp_patient_idx',
      },
      {
        fields: ['hospital_id', 'doctor_id'],
        name: 'ipd_progress_notes_hosp_doctor_idx',
      },
      {
        fields: ['hospital_id', 'progress_date'],
        name: 'ipd_progress_notes_hosp_date_idx',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'ipd_progress_notes_hosp_status_idx',
      },
    ],
  }
);

export default IpdProgressNote;
