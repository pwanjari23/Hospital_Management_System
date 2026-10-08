import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Payment extends Model {}

Payment.init(
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
    paymentNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'payment_number',
      validate: {
        notEmpty: { msg: 'Payment number is required' },
      },
    },
    paymentModeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'payment_mode_id',
      references: {
        model: 'payment_modes',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: { args: [0.01], msg: 'Payment amount must be greater than zero' },
      },
    },
    transactionReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'transaction_reference',
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'payment_date',
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'SUCCESS',
      validate: {
        isIn: {
          args: [['SUCCESS', 'VOID', 'REFUNDED', 'PARTIALLY_REFUNDED']],
          msg: 'Invalid payment status',
        },
      },
    },
    refundedAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'refunded_amount',
    },
    receivedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'received_by',
      references: {
        model: 'users',
        key: 'id',
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
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'payment_number'],
        name: 'payments_hospital_id_payment_number_unique',
      },
      {
        fields: ['hospital_id', 'invoice_id'],
        name: 'payments_hospital_id_invoice_id_idx',
      },
      {
        fields: ['hospital_id', 'patient_id'],
        name: 'payments_hospital_id_patient_id_idx',
      },
      {
        fields: ['hospital_id', 'payment_date'],
        name: 'payments_hospital_id_payment_date_idx',
      },
    ],
  }
);

export default Payment;
