import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class InvoiceItem extends Model {}

InvoiceItem.init(
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
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'invoice_id',
      references: {
        model: 'invoices',
        key: 'id',
      },
      onDelete: 'CASCADE',
      validate: {
        notNull: { msg: 'Invoice ID is required' },
      },
    },
    billingServiceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'billing_service_id',
      references: {
        model: 'billing_services',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Description is required' },
      },
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.0,
      validate: {
        min: { args: [0.01], msg: 'Quantity must be greater than zero' },
      },
    },
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'unit_price',
      validate: {
        min: { args: [0], msg: 'Unit price cannot be negative' },
      },
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'discount_amount',
      validate: {
        min: { args: [0], msg: 'Discount cannot be negative' },
      },
    },
    taxPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'tax_percentage',
      validate: {
        min: { args: [0], msg: 'Tax percentage cannot be negative' },
      },
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'tax_amount',
      validate: {
        min: { args: [0], msg: 'Tax amount cannot be negative' },
      },
    },
    lineTotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'line_total',
    },
    sourceType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'OTHER',
      field: 'source_type',
    },
    sourceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'source_id',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'InvoiceItem',
    tableName: 'invoice_items',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'invoice_id'],
        name: 'invoice_items_hospital_id_invoice_id_idx',
      },
      {
        fields: ['hospital_id', 'source_type', 'source_id'],
        name: 'invoice_items_hospital_id_source_idx',
      },
    ],
  }
);

export default InvoiceItem;
