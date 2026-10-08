import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class DischargeMedication extends Model {}

DischargeMedication.init(
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
    dischargeSummaryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'discharge_summary_id',
      references: {
        model: 'discharge_summaries',
        key: 'id',
      },
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Discharge summary ID is required' },
      },
    },
    medicineId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'medicine_id',
      references: {
        model: 'medicines',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    medicineName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'medicine_name',
      validate: {
        notEmpty: { msg: 'Medicine name is required' },
      },
    },
    dosage: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Dosage is required' },
      },
    },
    frequency: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Frequency is required' },
      },
    },
    route: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'ORAL',
    },
    duration: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Duration is required' },
      },
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'order_index',
    },
  },
  {
    sequelize,
    modelName: 'DischargeMedication',
    tableName: 'discharge_medications',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'discharge_summary_id'],
        name: 'discharge_medications_hosp_summary_idx',
      },
    ],
  }
);

export default DischargeMedication;
