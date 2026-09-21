import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class RolePermission extends Model {}

RolePermission.init(
  {
    roleId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      field: 'role_id',
      references: {
        model: 'roles',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    permissionId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      field: 'permission_id',
      references: {
        model: 'permissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    modelName: 'RolePermission',
    tableName: 'role_permissions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['role_id'],
      },
      {
        fields: ['permission_id'],
      },
    ],
  }
);

export default RolePermission;
