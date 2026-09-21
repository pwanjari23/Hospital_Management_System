import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Hospital extends Model {
  /**
   * Utility helper to convert text to URL-friendly slug
   */
  static slugify(text) {
    if (!text) return '';
    return text
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

Hospital.init(
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
      validate: {
        notEmpty: { msg: 'Hospital name cannot be empty' },
      },
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Hospital slug cannot be empty' },
      },
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'logo_url',
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
  },
  {
    sequelize,
    modelName: 'Hospital',
    tableName: 'hospitals',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['status'],
      },
    ],
    hooks: {
      beforeValidate: (hospital) => {
        if (hospital.slug) {
          hospital.slug = Hospital.slugify(hospital.slug);
        } else if (hospital.name) {
          hospital.slug = Hospital.slugify(hospital.name);
        }
      },
    },
  }
);

export default Hospital;
