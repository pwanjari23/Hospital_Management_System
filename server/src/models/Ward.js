import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Ward extends Model {}

Ward.init(
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
    wardCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'ward_code',
      validate: {
        notEmpty: { msg: 'Ward code is required' },
      },
    },
    wardName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'ward_name',
      validate: {
        notEmpty: { msg: 'Ward name is required' },
      },
    },
    wardType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'GENERAL',
      field: 'ward_type',
      validate: {
        isIn: {
          args: [['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'CCU', 'HDU', 'EMERGENCY', 'OTHER']],
          msg: 'Invalid ward type',
        },
      },
    },
    floor: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    genderPolicy: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ANY',
      field: 'gender_policy',
      validate: {
        isIn: {
          args: [['ANY', 'MALE', 'FEMALE']],
          msg: 'Gender policy must be ANY, MALE, or FEMALE',
        },
      },
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
    modelName: 'Ward',
    tableName: 'wards',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'ward_code'],
        name: 'wards_hospital_id_ward_code_unique',
      },
      {
        fields: ['hospital_id', 'ward_type'],
        name: 'wards_hospital_id_ward_type_idx',
      },
      {
        fields: ['hospital_id', 'is_active'],
        name: 'wards_hospital_id_is_active_idx',
      },
    ],
    hooks: {
      beforeValidate: (ward) => {
        if (ward.wardCode && typeof ward.wardCode === 'string') {
          ward.wardCode = ward.wardCode.trim().toUpperCase();
        }
        if (ward.wardName && typeof ward.wardName === 'string') {
          ward.wardName = ward.wardName.trim();
        }
        if (ward.wardType && typeof ward.wardType === 'string') {
          ward.wardType = ward.wardType.trim().toUpperCase();
        }
        if (ward.genderPolicy && typeof ward.genderPolicy === 'string') {
          ward.genderPolicy = ward.genderPolicy.trim().toUpperCase();
        }
      },
    },
  }
);

export default Ward;
