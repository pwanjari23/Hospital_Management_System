import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Treatment extends Model {}

Treatment.init(
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
        notNull: { msg: 'Treatment must belong to a hospital' },
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Treatment name is required' },
      },
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
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
    defaultCharge: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'default_charge',
      validate: {
        min: { args: [0], msg: 'Default charge cannot be negative' },
      },
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
    modelName: 'Treatment',
    tableName: 'treatments',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'name'],
        name: 'treatments_hospital_id_name_unique',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'treatments_hospital_id_status_idx',
      },
    ],
    hooks: {
      beforeValidate: (t) => {
        if (t.name && typeof t.name === 'string') t.name = t.name.trim();
        if (t.code && typeof t.code === 'string') t.code = t.code.trim().toUpperCase() || null;
        if (t.category && typeof t.category === 'string') t.category = t.category.trim() || null;
        if (t.description && typeof t.description === 'string') t.description = t.description.trim() || null;
      },
    },
  }
);

export default Treatment;
