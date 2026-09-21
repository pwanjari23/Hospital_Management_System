import sequelize from '../config/database.js';
import Hospital from './Hospital.js';
import User from './User.js';
import Role from './Role.js';
import Permission from './Permission.js';
import RolePermission from './RolePermission.js';
import UserRole from './UserRole.js';
import HospitalSetting from './HospitalSetting.js';

// ==========================================
// Centralized Model Associations
// ==========================================

// 1. Hospital <-> User (1:N)
Hospital.hasMany(User, {
  foreignKey: 'hospitalId',
  as: 'users',
  onDelete: 'RESTRICT',
});
User.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// 2. Hospital <-> HospitalSetting (1:N)
Hospital.hasMany(HospitalSetting, {
  foreignKey: 'hospitalId',
  as: 'settings',
  onDelete: 'RESTRICT',
});
HospitalSetting.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// 3. User <-> Role (M:N through UserRole)
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'userId',
  otherKey: 'roleId',
  as: 'roles',
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'roleId',
  otherKey: 'userId',
  as: 'users',
});

// Direct associations for UserRole junction
User.hasMany(UserRole, { foreignKey: 'userId', as: 'userRoles' });
UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Role.hasMany(UserRole, { foreignKey: 'roleId', as: 'userRoles' });
UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// 4. Role <-> Permission (M:N through RolePermission)
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles',
});

// Direct associations for RolePermission junction
Role.hasMany(RolePermission, { foreignKey: 'roleId', as: 'rolePermissions' });
RolePermission.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Permission.hasMany(RolePermission, { foreignKey: 'permissionId', as: 'rolePermissions' });
RolePermission.belongsTo(Permission, { foreignKey: 'permissionId', as: 'permission' });

export { sequelize, Hospital, User, Role, Permission, RolePermission, UserRole, HospitalSetting };

export default {
  sequelize,
  Hospital,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  HospitalSetting,
};
