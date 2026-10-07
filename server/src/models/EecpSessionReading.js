import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class EecpSessionReading extends Model {}

EecpSessionReading.init(
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
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'session_id',
      references: {
        model: 'eecp_sessions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'recorded_at',
    },
    systolicBp: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'systolic_bp',
    },
    diastolicBp: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'diastolic_bp',
    },
    pulseRate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'pulse_rate',
    },
    spo2: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    treatmentPressure: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'treatment_pressure',
    },
    patientComfort: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'patient_comfort',
    },
    symptoms: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recordedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'recorded_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    modelName: 'EecpSessionReading',
    tableName: 'eecp_session_readings',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['session_id', 'recorded_at'],
      },
      {
        fields: ['hospital_id'],
      },
    ],
  }
);

export default EecpSessionReading;
