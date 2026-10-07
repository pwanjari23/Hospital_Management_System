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
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Hospital name cannot be empty' },
        len: { args: [2, 255], msg: 'Hospital name must be between 2 and 255 characters' },
      },
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Hospital slug cannot be empty' },
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: { msg: 'Must be a valid email address' },
      },
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'India',
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'postal_code',
    },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'logo_url',
    },
    alternatePhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'alternate_phone',
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    workingHours: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'working_hours',
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Asia/Kolkata',
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'INR',
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
      {
        fields: ['name'],
      },
      {
        fields: ['created_at'],
      },
    ],
    hooks: {
      beforeValidate: (hospital) => {
        if (hospital.name && typeof hospital.name === 'string') {
          hospital.name = hospital.name.trim();
        }
        if (hospital.slug) {
          hospital.slug = Hospital.slugify(hospital.slug);
        } else if (hospital.name) {
          hospital.slug = Hospital.slugify(hospital.name);
        }
        if (hospital.email && typeof hospital.email === 'string') {
          hospital.email = hospital.email.trim().toLowerCase();
        }
        if (hospital.city && typeof hospital.city === 'string') {
          hospital.city = hospital.city.trim();
        }
        if (hospital.state && typeof hospital.state === 'string') {
          hospital.state = hospital.state.trim();
        }
        if (hospital.phone && typeof hospital.phone === 'string') {
          hospital.phone = hospital.phone.trim();
        }
      },
    },
  }
);

export default Hospital;
