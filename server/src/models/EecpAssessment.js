import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class EecpAssessment extends Model {}

EecpAssessment.init(
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
    encounterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'encounter_id',
      references: {
        model: 'encounters',
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
    indication: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    cardiacHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cardiac_history',
    },
    previousInterventions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'previous_interventions',
    },
    currentSymptoms: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'current_symptoms',
    },
    functionalStatus: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'functional_status',
    },
    suitabilityAssessment: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'SUITABLE',
      field: 'suitability_assessment',
      validate: {
        isIn: {
          args: [['SUITABLE', 'SUITABLE_WITH_PRECAUTIONS', 'UNSUITABLE', 'PENDING_EVALUATION']],
          msg: 'Suitability must be SUITABLE, SUITABLE_WITH_PRECAUTIONS, UNSUITABLE, or PENDING_EVALUATION',
        },
      },
    },
    contraindicationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'contraindication_notes',
    },
    recommendedSessions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 35,
      field: 'recommended_sessions',
    },
    doctorNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'doctor_notes',
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
    modelName: 'EecpAssessment',
    tableName: 'eecp_assessments',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'encounter_id'],
      },
      {
        fields: ['hospital_id', 'patient_id'],
      },
      {
        fields: ['hospital_id', 'doctor_id'],
      },
    ],
  }
);

export default EecpAssessment;
