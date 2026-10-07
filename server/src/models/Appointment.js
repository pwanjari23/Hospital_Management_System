import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Appointment extends Model {}

Appointment.init(
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
    appointmentNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'appointment_number',
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
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'doctor_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'department_id',
      references: {
        model: 'departments',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    appointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'appointment_date',
    },
    startTime: {
      type: DataTypes.STRING(8),
      allowNull: false,
      field: 'start_time',
    },
    endTime: {
      type: DataTypes.STRING(8),
      allowNull: false,
      field: 'end_time',
    },
    appointmentType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'OPD Consultation',
      field: 'appointment_type',
    },
    status: {
      type: DataTypes.ENUM(
        'SCHEDULED',
        'CONFIRMED',
        'CHECKED_IN',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW',
        'RESCHEDULED'
      ),
      allowNull: false,
      defaultValue: 'SCHEDULED',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    consultationFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'consultation_fee',
    },
    paymentStatus: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'EXEMPT', 'PARTIAL'),
      allowNull: false,
      defaultValue: 'PENDING',
      field: 'payment_status',
    },
    bookedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'booked_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
    checkedInAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'checked_in_at',
    },
  },
  {
    sequelize,
    modelName: 'Appointment',
    tableName: 'appointments',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'appointment_number'],
      },
      {
        fields: ['hospital_id', 'appointment_date'],
      },
      {
        fields: ['hospital_id', 'doctor_id', 'appointment_date'],
      },
      {
        fields: ['hospital_id', 'patient_id'],
      },
      {
        fields: ['hospital_id', 'status'],
      },
    ],
  }
);

export default Appointment;
