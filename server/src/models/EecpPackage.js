import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class EecpPackage extends Model {}

EecpPackage.init(
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
        notNull: { msg: 'EECP package must belong to a hospital' },
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Package name is required' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    numberOfSessions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 35,
      field: 'number_of_sessions',
      validate: {
        min: { args: [1], msg: 'Number of sessions must be at least 1' },
      },
    },
    validityPeriod: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'validity_period',
    },
    packagePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'package_price',
      validate: {
        min: { args: [0], msg: 'Package price cannot be negative' },
      },
    },
    sessionDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      field: 'session_duration',
      validate: {
        min: { args: [1], msg: 'Session duration must be at least 1 minute' },
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
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'EecpPackage',
    tableName: 'eecp_packages',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'name'],
        name: 'eecp_packages_hospital_id_name_unique',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'eecp_packages_hospital_id_status_idx',
      },
    ],
    hooks: {
      beforeValidate: (pkg) => {
        if (pkg.name && typeof pkg.name === 'string') pkg.name = pkg.name.trim();
        if (pkg.description && typeof pkg.description === 'string') pkg.description = pkg.description.trim() || null;
        if (pkg.validityPeriod && typeof pkg.validityPeriod === 'string') pkg.validityPeriod = pkg.validityPeriod.trim() || null;
        if (pkg.notes && typeof pkg.notes === 'string') pkg.notes = pkg.notes.trim() || null;
      },
    },
  }
);

export default EecpPackage;
