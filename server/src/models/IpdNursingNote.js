import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class IpdNursingNote extends Model {}

IpdNursingNote.init(
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
    nurseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'nurse_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Nurse ID is required' },
      },
    },
    noteDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'note_date',
    },
    noteTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'note_time',
    },
    observations: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Observations cannot be empty' },
      },
    },
    painScale: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'pain_scale',
      validate: {
        min: 0,
        max: 10,
      },
    },
    mobility: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    diet: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    intakeOutput: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'intake_output',
    },
    nursingInterventions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'nursing_interventions',
    },
    safetyObservations: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'safety_observations',
    },
    doctorNotificationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'doctor_notification_notes',
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
          msg: 'Invalid nursing note status',
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
    modelName: 'IpdNursingNote',
    tableName: 'ipd_nursing_notes',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'admission_id'],
        name: 'ipd_nursing_notes_hosp_adm_idx',
      },
      {
        fields: ['hospital_id', 'patient_id'],
        name: 'ipd_nursing_notes_hosp_patient_idx',
      },
      {
        fields: ['hospital_id', 'nurse_id'],
        name: 'ipd_nursing_notes_hosp_nurse_idx',
      },
      {
        fields: ['hospital_id', 'note_date'],
        name: 'ipd_nursing_notes_hosp_date_idx',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'ipd_nursing_notes_hosp_status_idx',
      },
    ],
  }
);

export default IpdNursingNote;
