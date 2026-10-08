import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class BillingService extends Model {}

BillingService.init(
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
    serviceCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'service_code',
      validate: {
        notEmpty: { msg: 'Service code is required' },
      },
    },
    serviceName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'service_name',
      validate: {
        notEmpty: { msg: 'Service name is required' },
      },
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'OTHER',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    defaultPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'default_price',
      validate: {
        min: { args: [0], msg: 'Default price cannot be negative' },
      },
    },
    taxPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'tax_percentage',
      validate: {
        min: { args: [0], msg: 'Tax percentage cannot be negative' },
        max: { args: [100], msg: 'Tax percentage cannot exceed 100' },
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
    modelName: 'BillingService',
    tableName: 'billing_services',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'service_code'],
        name: 'billing_services_hospital_id_service_code_unique',
      },
      {
        fields: ['hospital_id', 'category'],
        name: 'billing_services_hospital_id_category_idx',
      },
      {
        fields: ['hospital_id', 'is_active'],
        name: 'billing_services_hospital_id_is_active_idx',
      },
    ],
    hooks: {
      beforeValidate: (service) => {
        if (service.serviceCode && typeof service.serviceCode === 'string') {
          service.serviceCode = service.serviceCode.trim().toUpperCase();
        }
        if (service.serviceName && typeof service.serviceName === 'string') {
          service.serviceName = service.serviceName.trim();
        }
        if (service.category && typeof service.category === 'string') {
          service.category = service.category.trim().toUpperCase();
        }
      },
    },
  }
);

export default BillingService;
