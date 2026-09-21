import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Role extends Model {}

Role.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Role name cannot be empty' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    scope: {
      type: DataTypes.ENUM('PLATFORM', 'HOSPITAL'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['PLATFORM', 'HOSPITAL']],
          msg: 'Role scope must be PLATFORM or HOSPITAL',
        },
      },
    },
  },
  {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name'],
      },
      {
        fields: ['scope'],
      },
    ],
  }
);

export default Role;
