import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Permission extends Model {}

Permission.init(
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
        notEmpty: { msg: 'Permission name cannot be empty' },
        is: {
          args: /^[a-z]+(\.[a-z]+)+$/,
          msg: 'Permission name must follow resource.action convention (e.g. user.read)',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Permission',
    tableName: 'permissions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name'],
      },
    ],
  }
);

export default Permission;
