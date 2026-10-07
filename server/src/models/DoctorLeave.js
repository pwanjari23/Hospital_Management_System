import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class DoctorLeave extends Model {}

DoctorLeave.init(
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
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'end_date',
    },
    reason: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    modelName: 'DoctorLeave',
    tableName: 'doctor_leaves',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id', 'doctor_id', 'start_date', 'end_date'],
      },
      {
        fields: ['hospital_id', 'is_active'],
      },
    ],
  }
);

export default DoctorLeave;
