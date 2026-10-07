import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class EecpSession extends Model {}

EecpSession.init(
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
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'course_id',
      references: {
        model: 'eecp_treatment_courses',
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
    encounterId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'encounter_id',
      references: {
        model: 'encounters',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    staffId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'staff_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'doctor_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    sessionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'session_number',
      validate: {
        min: { args: [1], msg: 'Session number must be at least 1' },
      },
    },
    scheduledDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'scheduled_date',
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
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      field: 'duration_minutes',
    },
    pressureApplied: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'pressure_applied',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'SCHEDULED',
      validate: {
        isIn: {
          args: [['SCHEDULED', 'PRE_ASSESSMENT', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']],
          msg: 'Status must be SCHEDULED, PRE_ASSESSMENT, IN_PROGRESS, PAUSED, COMPLETED, or CANCELLED',
        },
      },
    },
    preBpSystolic: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'pre_bp_systolic',
    },
    preBpDiastolic: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'pre_bp_diastolic',
    },
    prePulse: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'pre_pulse',
    },
    preSpo2: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'pre_spo2',
    },
    preWeightKg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'pre_weight_kg',
    },
    preSessionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'pre_session_notes',
    },
    triggerMode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'ECG_R_WAVE',
      field: 'trigger_mode',
    },
    patientTolerance: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'GOOD',
      field: 'patient_tolerance',
    },
    intraSessionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'intra_session_notes',
    },
    adverseEvent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'adverse_event',
    },
    adverseEventNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'adverse_event_notes',
    },
    interruptionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'interruption_reason',
    },
    postBpSystolic: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'post_bp_systolic',
    },
    postBpDiastolic: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'post_bp_diastolic',
    },
    postPulse: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'post_pulse',
    },
    postSpo2: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'post_spo2',
    },
    postSessionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'post_session_notes',
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
    modelName: 'EecpSession',
    tableName: 'eecp_sessions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['course_id', 'session_number'],
      },
      {
        fields: ['hospital_id', 'scheduled_date'],
      },
      {
        fields: ['hospital_id', 'status'],
      },
      {
        fields: ['hospital_id', 'patient_id'],
      },
    ],
  }
);

export default EecpSession;
