import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class User extends Model {
  /**
   * Safe serialization excluding passwordHash from JSON responses
   */
  toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    delete values.password_hash;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    hospitalId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'hospital_id',
      references: {
        model: 'hospitals',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'User name cannot be empty' },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: { msg: 'Must be a valid email address' },
        notEmpty: { msg: 'Email cannot be empty' },
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'password_hash',
      validate: {
        notEmpty: { msg: 'Password hash cannot be empty' },
      },
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: {
          args: [['ACTIVE', 'INACTIVE', 'SUSPENDED']],
          msg: 'Status must be ACTIVE, INACTIVE, or SUSPENDED',
        },
      },
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
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    qualification: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    specialization: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    licenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'license_number',
    },
    experienceYears: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'experience_years',
    },
    consultationFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      field: 'consultation_fee',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['passwordHash', 'password_hash'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['passwordHash', 'password_hash'] },
      },
    },
    indexes: [
      {
        fields: ['hospital_id'],
      },
      {
        unique: true,
        fields: ['hospital_id', 'email'],
        name: 'users_hospital_id_email_unique',
      },
      {
        unique: true,
        fields: ['email'],
        where: {
          hospital_id: null,
        },
        name: 'users_platform_email_unique',
      },
      {
        fields: ['status'],
      },
    ],
    hooks: {
      beforeValidate: (user) => {
        if (user.email && typeof user.email === 'string') {
          user.email = user.email.trim().toLowerCase();
        }
      },
    },
  }
);

export default User;
