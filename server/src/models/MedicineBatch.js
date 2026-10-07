import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class MedicineBatch extends Model {}

MedicineBatch.init(
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
    batchNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'batch_number',
      validate: {
        notEmpty: { msg: 'Batch number is required' },
      },
    },
    manufacturingDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'manufacturing_date',
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'expiry_date',
      validate: {
        notNull: { msg: 'Expiry date is required' },
      },
    },
    purchaseRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'purchase_rate',
    },
    sellingRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'selling_rate',
    },
    quantityReceived: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'quantity_received',
      validate: {
        min: { args: [0], msg: 'Received quantity cannot be negative' },
      },
    },
    quantityAvailable: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'quantity_available',
      validate: {
        min: { args: [0], msg: 'Available quantity cannot be negative' },
      },
    },
    reorderLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      field: 'reorder_level',
      validate: {
        min: { args: [0], msg: 'Reorder level cannot be negative' },
      },
    },
    storageLocation: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'storage_location',
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'BLOCKED', 'DEPLETED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: {
          args: [['ACTIVE', 'EXPIRED', 'BLOCKED', 'DEPLETED']],
          msg: 'Status must be ACTIVE, EXPIRED, BLOCKED, or DEPLETED',
        },
      },
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
    modelName: 'MedicineBatch',
    tableName: 'medicine_batches',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'medicine_id', 'batch_number'],
      },
      {
        fields: ['hospital_id', 'expiry_date'],
      },
      {
        fields: ['hospital_id', 'status'],
      },
      {
        fields: ['medicine_id', 'status'],
      },
    ],
    hooks: {
      beforeValidate: (batch) => {
        if (batch.batchNumber && typeof batch.batchNumber === 'string') {
          batch.batchNumber = batch.batchNumber.trim();
        }
        if (batch.storageLocation && typeof batch.storageLocation === 'string') {
          batch.storageLocation = batch.storageLocation.trim() || null;
        }
      },
    },
  }
);

export default MedicineBatch;
