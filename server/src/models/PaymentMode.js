import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class PaymentMode extends Model {}

PaymentMode.init(
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
        notNull: { msg: 'Payment mode must belong to a hospital' },
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Payment mode name is required' },
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
    modelName: 'PaymentMode',
    tableName: 'payment_modes',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'name'],
        name: 'payment_modes_hospital_id_name_unique',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'payment_modes_hospital_id_status_idx',
      },
    ],
    hooks: {
      beforeValidate: (pm) => {
        if (pm.name && typeof pm.name === 'string') pm.name = pm.name.trim();
        if (pm.code && typeof pm.code === 'string') pm.code = pm.code.trim().toUpperCase() || null;
        if (pm.description && typeof pm.description === 'string') pm.description = pm.description.trim() || null;
      },
    },
  }
);

export default PaymentMode;
