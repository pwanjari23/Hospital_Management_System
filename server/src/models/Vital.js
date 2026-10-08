import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Vital extends Model {}

Vital.init(
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
      allowNull: true,
      field: 'encounter_id',
      references: {
        model: 'encounters',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    ipdAdmissionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ipd_admission_id',
      references: {
        model: 'ipd_admissions',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'recorded_at',
    },
    temperature: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true,
    },
    pulseRate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'pulse_rate',
    },
    respiratoryRate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'respiratory_rate',
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
    spo2: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    weightKg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'weight_kg',
    },
    heightCm: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'height_cm',
    },
    bmi: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true,
    },
    bloodGlucose: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'blood_glucose',
    },
    painScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'pain_score',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Vital',
    tableName: 'vitals',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeSave: (instance) => {
        // Automatic BMI calculation if weight and height are provided
        if (instance.weightKg && instance.heightCm && Number(instance.heightCm) > 0) {
          const heightM = Number(instance.heightCm) / 100;
          const calculatedBmi = Number(instance.weightKg) / (heightM * heightM);
          instance.bmi = Number(calculatedBmi.toFixed(1));
        }
      },
    },
    indexes: [
      {
        fields: ['hospital_id', 'encounter_id'],
      },
      {
        fields: ['hospital_id', 'ipd_admission_id'],
      },
      {
        fields: ['hospital_id', 'patient_id', 'recorded_at'],
      },
    ],
  }
);

export default Vital;
