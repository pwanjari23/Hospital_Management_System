import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class EecpTreatmentCourse extends Model {}

EecpTreatmentCourse.init(
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
    courseNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'course_number',
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
    initiatingEncounterId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'initiating_encounter_id',
      references: {
        model: 'encounters',
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
    packageId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'package_id',
      references: {
        model: 'eecp_packages',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'end_date',
    },
    plannedSessions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 35,
      field: 'planned_sessions',
      validate: {
        min: { args: [1], msg: 'Planned sessions must be at least 1' },
      },
    },
    completedSessions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'completed_sessions',
      validate: {
        min: { args: [0], msg: 'Completed sessions cannot be negative' },
      },
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: {
          args: [['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']],
          msg: 'Status must be PLANNED, ACTIVE, PAUSED, COMPLETED, or CANCELLED',
        },
      },
    },
    treatmentPlan: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'treatment_plan',
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cancellation_reason',
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
    modelName: 'EecpTreatmentCourse',
    tableName: 'eecp_treatment_courses',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'course_number'],
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

export default EecpTreatmentCourse;
