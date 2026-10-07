import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Encounter extends Model {}

Encounter.init(
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
    encounterNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'encounter_number',
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
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'appointment_id',
      references: {
        model: 'appointments',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'department_id',
      references: {
        model: 'departments',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    encounterType: {
      type: DataTypes.ENUM(
        'OPD',
        'FOLLOW_UP',
        'EECP_CONSULTATION',
        'EECP_SESSION',
        'EMERGENCY',
        'OTHER'
      ),
      allowNull: false,
      defaultValue: 'OPD',
      field: 'encounter_type',
    },
    status: {
      type: DataTypes.ENUM(
        'OPEN',
        'VITALS_PENDING',
        'READY_FOR_DOCTOR',
        'IN_CONSULTATION',
        'COMPLETED',
        'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'VITALS_PENDING',
    },
    chiefComplaint: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'chief_complaint',
    },
    historyOfPresentIllness: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'history_of_present_illness',
    },
    pastMedicalHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'past_medical_history',
    },
    surgicalHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'surgical_history',
    },
    familyHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'family_history',
    },
    socialHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'social_history',
    },
    clinicalExamination: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'clinical_examination',
    },
    assessment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    treatmentPlan: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'treatment_plan',
    },
    followUpDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'follow_up_date',
    },
    followUpNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'follow_up_notes',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'started_at',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
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
    modelName: 'Encounter',
    tableName: 'encounters',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'encounter_number'],
      },
      {
        fields: ['hospital_id', 'patient_id'],
      },
      {
        fields: ['hospital_id', 'doctor_id'],
      },
      {
        fields: ['hospital_id', 'appointment_id'],
      },
      {
        fields: ['hospital_id', 'status'],
      },
      {
        fields: ['hospital_id', 'created_at'],
      },
    ],
  }
);

export default Encounter;
