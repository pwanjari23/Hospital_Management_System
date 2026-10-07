import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class PharmacyStockTransaction extends Model {}

PharmacyStockTransaction.init(
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
    transactionType: {
      type: DataTypes.ENUM('STOCK_IN', 'DISPENSE', 'RETURN', 'ADJUSTMENT', 'EXPIRED', 'DAMAGED'),
      allowNull: false,
      field: 'transaction_type',
      validate: {
        isIn: {
          args: [['STOCK_IN', 'DISPENSE', 'RETURN', 'ADJUSTMENT', 'EXPIRED', 'DAMAGED']],
          msg: 'Invalid transaction type',
        },
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'Quantity cannot be negative' },
      },
    },
    referenceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'reference_type',
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'reference_id',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    performedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'performed_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'transaction_date',
    },
  },
  {
    sequelize,
    modelName: 'PharmacyStockTransaction',
    tableName: 'pharmacy_stock_transactions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'batch_id'],
      },
      {
        fields: ['hospital_id', 'medicine_id'],
      },
      {
        fields: ['hospital_id', 'transaction_type'],
      },
      {
        fields: ['hospital_id', 'transaction_date'],
      },
    ],
  }
);

export default PharmacyStockTransaction;
