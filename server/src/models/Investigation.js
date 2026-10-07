import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Investigation extends Model {}

Investigation.init(
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
        notNull: { msg: 'Investigation must belong to a hospital' },
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Investigation name is required' },
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
    modelName: 'Investigation',
    tableName: 'investigations',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'name'],
        name: 'investigations_hospital_id_name_unique',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'investigations_hospital_id_status_idx',
      },
    ],
    hooks: {
      beforeValidate: (inv) => {
        if (inv.name && typeof inv.name === 'string') inv.name = inv.name.trim();
        if (inv.code && typeof inv.code === 'string') inv.code = inv.code.trim().toUpperCase() || null;
        if (inv.category && typeof inv.category === 'string') inv.category = inv.category.trim() || null;
        if (inv.description && typeof inv.description === 'string') inv.description = inv.description.trim() || null;
      },
    },
  }
);

export default Investigation;
