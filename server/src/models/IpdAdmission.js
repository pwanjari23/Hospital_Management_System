import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class IpdAdmission extends Model {}

IpdAdmission.init(
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
    admissionNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'admission_number',
      validate: {
        notEmpty: { msg: 'Admission number is required' },
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
    admittingDoctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'admitting_doctor_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Admitting doctor ID is required' },
      },
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'department_id',
      references: {
        model: 'departments',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Department ID is required' },
      },
    },
    wardId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ward_id',
      references: {
        model: 'wards',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Ward ID is required' },
      },
    },
    bedId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'bed_id',
      references: {
        model: 'beds',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Bed ID is required' },
      },
    },
    admissionType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'PLANNED',
      field: 'admission_type',
      validate: {
        isIn: {
          args: [['EMERGENCY', 'PLANNED', 'TRANSFER', 'OBSERVATION', 'OTHER']],
          msg: 'Invalid admission type',
        },
      },
    },
    admissionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'admission_date',
    },
    admissionTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'admission_time',
    },
    reasonForAdmission: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'reason_for_admission',
      validate: {
        notEmpty: { msg: 'Reason for admission is required' },
      },
    },
    provisionalDiagnosis: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'provisional_diagnosis',
    },
    referredBy: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'referred_by',
    },
    emergencyCase: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'emergency_case',
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'ADMITTED',
      validate: {
        isIn: {
          args: [['ADMITTED', 'TRANSFER_PENDING', 'DISCHARGE_PENDING', 'DISCHARGED', 'CANCELLED']],
          msg: 'Invalid admission status',
        },
      },
    },
    expectedDischargeDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expected_discharge_date',
    },
    dischargedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'discharged_at',
    },
    dischargeSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'discharge_summary',
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
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'IpdAdmission',
    tableName: 'ipd_admissions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'admission_number'],
        name: 'ipd_admissions_hospital_id_admission_number_unique',
      },
      {
        fields: ['hospital_id', 'patient_id'],
        name: 'ipd_admissions_hospital_id_patient_id_idx',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'ipd_admissions_hospital_id_status_idx',
      },
      {
        fields: ['hospital_id', 'ward_id'],
        name: 'ipd_admissions_hospital_id_ward_id_idx',
      },
      {
        fields: ['hospital_id', 'bed_id'],
        name: 'ipd_admissions_hospital_id_bed_id_idx',
      },
      {
        fields: ['hospital_id', 'admitting_doctor_id'],
        name: 'ipd_admissions_hospital_id_admitting_doctor_id_idx',
      },
      {
        fields: ['hospital_id', 'admission_date'],
        name: 'ipd_admissions_hospital_id_admission_date_idx',
      },
    ],
  }
);

export default IpdAdmission;
