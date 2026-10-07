import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class PrescriptionDispensingItem extends Model {}

PrescriptionDispensingItem.init(
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
    dispensingId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'dispensing_id',
      references: {
        model: 'prescription_dispensings',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    prescriptionItemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'prescription_item_id',
      references: {
        model: 'prescription_items',
        key: 'id',
      },
      onDelete: 'RESTRICT',
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
    batchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'batch_id',
      references: {
        model: 'medicine_batches',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    prescribedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'prescribed_quantity',
      validate: {
        min: { args: [1], msg: 'Prescribed quantity must be greater than zero' },
      },
    },
    dispensedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'dispensed_quantity',
      validate: {
        min: { args: [1], msg: 'Dispensed quantity must be greater than zero' },
      },
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
    modelName: 'PrescriptionDispensingItem',
    tableName: 'prescription_dispensing_items',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'dispensing_id'],
      },
      {
        fields: ['hospital_id', 'prescription_item_id'],
      },
      {
        fields: ['hospital_id', 'batch_id'],
      },
      {
        fields: ['hospital_id', 'medicine_id'],
      },
    ],
  }
);

export default PrescriptionDispensingItem;
