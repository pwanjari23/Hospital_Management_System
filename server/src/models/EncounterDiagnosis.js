import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class EncounterDiagnosis extends Model {}

EncounterDiagnosis.init(
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
      onDelete: 'CASCADE',
    },
    diagnosisName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'diagnosis_name',
    },
    diagnosisCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'diagnosis_code',
    },
    diagnosisType: {
      type: DataTypes.ENUM('PRIMARY', 'SECONDARY', 'DIFFERENTIAL'),
      allowNull: false,
      defaultValue: 'PRIMARY',
      field: 'diagnosis_type',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_primary',
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
  },
  {
    sequelize,
    modelName: 'EncounterDiagnosis',
    tableName: 'encounter_diagnoses',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'encounter_id'],
      },
    ],
  }
);

export default EncounterDiagnosis;
