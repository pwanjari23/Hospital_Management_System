import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class DischargeSummary extends Model {}

DischargeSummary.init(
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
    dischargeSummaryNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'discharge_summary_number',
    },
    dischargingDoctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'discharging_doctor_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Discharging doctor is required' },
      },
    },
    dischargeDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'discharge_date',
    },
    dischargeTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'discharge_time',
    },
    reasonForAdmission: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'reason_for_admission',
    },
    provisionalDiagnosis: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'provisional_diagnosis',
    },
    finalDiagnosis: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'final_diagnosis',
      validate: {
        notEmpty: { msg: 'Final diagnosis is required' },
      },
    },
    hospitalCourse: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'hospital_course',
    },
    significantFindings: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'significant_findings',
    },
    investigationSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'investigation_summary',
    },
    treatmentGiven: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'treatment_given',
    },
    complications: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    conditionAtDischarge: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'condition_at_discharge',
    },
    disposition: {
      type: DataTypes.ENUM('HOME', 'TRANSFERRED', 'LAMA', 'ABSCONDED', 'REFERRED', 'DECEASED'),
      allowNull: false,
      defaultValue: 'HOME',
      validate: {
        isIn: {
          args: [['HOME', 'TRANSFERRED', 'LAMA', 'ABSCONDED', 'REFERRED', 'DECEASED']],
          msg: 'Invalid disposition value',
        },
      },
    },
    dischargeInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'discharge_instructions',
    },
    dietInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'diet_instructions',
    },
    activityInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'activity_instructions',
    },
    warningSigns: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'warning_signs',
    },
    followUpDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'follow_up_date',
    },
    followUpInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'follow_up_instructions',
    },
    doctorRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'doctor_remarks',
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'FINALIZED'),
      allowNull: false,
      defaultValue: 'DRAFT',
      validate: {
        isIn: {
          args: [['DRAFT', 'FINALIZED']],
          msg: 'Invalid discharge summary status',
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
    modelName: 'DischargeSummary',
    tableName: 'discharge_summaries',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'admission_id'],
        name: 'discharge_summaries_hosp_admission_unique',
      },
      {
        unique: true,
        fields: ['hospital_id', 'discharge_summary_number'],
        name: 'discharge_summaries_hosp_number_unique',
      },
      {
        fields: ['hospital_id', 'patient_id'],
        name: 'discharge_summaries_hosp_patient_idx',
      },
      {
        fields: ['hospital_id', 'discharging_doctor_id'],
        name: 'discharge_summaries_hosp_doctor_idx',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'discharge_summaries_hosp_status_idx',
      },
    ],
  }
);

export default DischargeSummary;
