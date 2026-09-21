import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class UserRole extends Model {}

UserRole.init(
  {
    userId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    roleId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      field: 'role_id',
      references: {
        model: 'roles',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
  },
  {
    sequelize,
    modelName: 'UserRole',
    tableName: 'user_roles',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['role_id'],
      },
    ],
  }
);

export default UserRole;
