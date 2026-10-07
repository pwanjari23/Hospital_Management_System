import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Department extends Model {}

Department.init(
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
        notNull: { msg: 'Department must belong to a hospital' },
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Department name is required' },
        len: { args: [2, 100], msg: 'Department name must be between 2 and 100 characters' },
      },
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: {
          args: [['ACTIVE', 'INACTIVE']],
          msg: 'Status must be ACTIVE or INACTIVE',
        },
      },
    },
  },
  {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'name'],
        name: 'departments_hospital_id_name_unique',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'departments_hospital_id_status_idx',
      },
    ],
    hooks: {
      beforeValidate: (department) => {
        if (department.name && typeof department.name === 'string') {
          department.name = department.name.trim();
        }
        if (department.code && typeof department.code === 'string') {
          department.code = department.code.trim().toUpperCase() || null;
        }
        if (department.description && typeof department.description === 'string') {
          department.description = department.description.trim() || null;
        }
      },
    },
  }
);

export default Department;
