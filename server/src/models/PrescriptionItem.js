import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class PrescriptionItem extends Model {}

PrescriptionItem.init(
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
    prescriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'prescription_id',
      references: {
        model: 'prescriptions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    medicineId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'medicine_id',
      references: {
        model: 'medicines',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    medicineName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'medicine_name',
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
      allowNull: true,
      defaultValue: 'ORAL',
    },
    durationValue: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'duration_value',
    },
    durationUnit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'DAYS',
      field: 'duration_unit',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    foodInstruction: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'food_instruction',
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
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
    modelName: 'PrescriptionItem',
    tableName: 'prescription_items',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'prescription_id'],
      },
      {
        fields: ['hospital_id', 'medicine_id'],
      },
    ],
  }
);

export default PrescriptionItem;
