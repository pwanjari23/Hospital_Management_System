import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class Medicine extends Model {}

Medicine.init(
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
        notNull: { msg: 'Medicine must belong to a hospital' },
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Medicine name is required' },
      },
    },
    genericName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'generic_name',
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    strength: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    dosageForm: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'dosage_form',
    },
    manufacturer: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(50),
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
    modelName: 'Medicine',
    tableName: 'medicines',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'name'],
        name: 'medicines_hospital_id_name_unique',
      },
      {
        fields: ['hospital_id', 'status'],
        name: 'medicines_hospital_id_status_idx',
      },
      {
        fields: ['hospital_id', 'category'],
        name: 'medicines_hospital_id_category_idx',
      },
    ],
    hooks: {
      beforeValidate: (med) => {
        if (med.name && typeof med.name === 'string') med.name = med.name.trim();
        if (med.genericName && typeof med.genericName === 'string') med.genericName = med.genericName.trim() || null;
        if (med.category && typeof med.category === 'string') med.category = med.category.trim() || null;
        if (med.strength && typeof med.strength === 'string') med.strength = med.strength.trim() || null;
        if (med.dosageForm && typeof med.dosageForm === 'string') med.dosageForm = med.dosageForm.trim() || null;
        if (med.manufacturer && typeof med.manufacturer === 'string') med.manufacturer = med.manufacturer.trim() || null;
        if (med.unit && typeof med.unit === 'string') med.unit = med.unit.trim() || null;
      },
    },
  }
);

export default Medicine;
