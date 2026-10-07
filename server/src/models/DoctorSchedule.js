import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class DoctorSchedule extends Model {}

DoctorSchedule.init(
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
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'doctor_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    dayOfWeek: {
      type: DataTypes.ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
      allowNull: false,
      field: 'day_of_week',
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
    breakStartTime: {
      type: DataTypes.STRING(8),
      allowNull: true,
      field: 'break_start_time',
    },
    breakEndTime: {
      type: DataTypes.STRING(8),
      allowNull: true,
      field: 'break_end_time',
    },
    slotDurationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      field: 'slot_duration_minutes',
    },
    maxAppointmentsPerSlot: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'max_appointments_per_slot',
    },
    consultationType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'OPD Consultation',
      field: 'consultation_type',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'DoctorSchedule',
    tableName: 'doctor_schedules',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'doctor_id', 'day_of_week'],
      },
      {
        fields: ['hospital_id', 'is_active'],
      },
    ],
  }
);

export default DoctorSchedule;
