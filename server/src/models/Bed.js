import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Bed extends Model {}

Bed.init(
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
    wardId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ward_id',
      references: {
        model: 'wards',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Ward ID is required' },
      },
    },
    bedNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'bed_number',
      validate: {
        notEmpty: { msg: 'Bed number is required' },
      },
    },
    bedType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'STANDARD',
      field: 'bed_type',
      validate: {
        isIn: {
          args: [['STANDARD', 'ICU', 'CCU', 'PRIVATE', 'SEMI_PRIVATE', 'EMERGENCY', 'OTHER']],
          msg: 'Invalid bed type',
        },
      },
    },
    floor: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'AVAILABLE',
      validate: {
        isIn: {
          args: [['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'BLOCKED']],
          msg: 'Invalid bed status',
        },
      },
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
    modelName: 'Bed',
    tableName: 'beds',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'ward_id', 'bed_number'],
        name: 'beds_hospital_id_ward_id_bed_number_unique',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'beds_hospital_id_status_idx',
      },
      {
        fields: ['hospital_id', 'ward_id', 'status'],
        name: 'beds_hospital_id_ward_id_status_idx',
      },
    ],
    hooks: {
      beforeValidate: (bed) => {
        if (bed.bedNumber && typeof bed.bedNumber === 'string') {
          bed.bedNumber = bed.bedNumber.trim().toUpperCase();
        }
        if (bed.bedType && typeof bed.bedType === 'string') {
          bed.bedType = bed.bedType.trim().toUpperCase();
        }
        if (bed.status && typeof bed.status === 'string') {
          bed.status = bed.status.trim().toUpperCase();
        }
      },
    },
  }
);

export default Bed;
