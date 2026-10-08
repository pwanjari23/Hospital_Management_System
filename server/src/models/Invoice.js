import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Invoice extends Model {}

Invoice.init(
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
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'invoice_number',
      validate: {
        notEmpty: { msg: 'Invoice number is required' },
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
    encounterId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'encounter_id',
      references: {
        model: 'encounters',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'appointment_id',
      references: {
        model: 'appointments',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    invoiceDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'invoice_date',
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'subtotal',
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'discount_amount',
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'tax_amount',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'total_amount',
    },
    paidAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'paid_amount',
    },
    dueAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'due_amount',
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'DRAFT',
      field: 'status',
      validate: {
        isIn: {
          args: [['DRAFT', 'ISSUED', 'CANCELLED']],
          msg: 'Invalid invoice status',
        },
      },
    },
    paymentStatus: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'UNPAID',
      field: 'payment_status',
      validate: {
        isIn: {
          args: [['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED']],
          msg: 'Invalid payment status',
        },
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cancellation_reason',
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cancelled_at',
    },
    cancelledBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'cancelled_by',
      references: {
        model: 'users',
        key: 'id',
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
    modelName: 'Invoice',
    tableName: 'invoices',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'invoice_number'],
        name: 'invoices_hospital_id_invoice_number_unique',
      },
      {
        fields: ['hospital_id', 'patient_id'],
        name: 'invoices_hospital_id_patient_id_idx',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'invoices_hospital_id_status_idx',
      },
      {
        fields: ['hospital_id', 'payment_status'],
        name: 'invoices_hospital_id_payment_status_idx',
      },
      {
        fields: ['hospital_id', 'invoice_date'],
        name: 'invoices_hospital_id_invoice_date_idx',
      },
    ],
  }
);

export default Invoice;
