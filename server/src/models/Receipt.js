import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Receipt extends Model {}

Receipt.init(
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
    receiptNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'receipt_number',
      validate: {
        notEmpty: { msg: 'Receipt number is required' },
      },
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'payment_id',
      references: {
        model: 'payments',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Payment ID is required' },
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
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Invoice ID is required' },
      },
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
      validate: {
        notNull: { msg: 'Patient ID is required' },
      },
    },
    receiptDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'receipt_date',
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: { args: [0.01], msg: 'Receipt amount must be greater than zero' },
      },
    },
    generatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'generated_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Receipt',
    tableName: 'receipts',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'receipt_number'],
        name: 'receipts_hospital_id_receipt_number_unique',
      },
      {
        fields: ['hospital_id', 'payment_id'],
        name: 'receipts_hospital_id_payment_id_idx',
      },
      {
        fields: ['hospital_id', 'invoice_id'],
        name: 'receipts_hospital_id_invoice_id_idx',
      },
      {
        fields: ['hospital_id', 'patient_id'],
        name: 'receipts_hospital_id_patient_id_idx',
      },
    ],
  }
);

export default Receipt;
