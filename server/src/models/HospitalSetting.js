import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class HospitalSetting extends Model {}

HospitalSetting.init(
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
        notNull: { msg: 'hospitalId is required' },
      },
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Setting key cannot be empty' },
      },
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'HospitalSetting',
    tableName: 'hospital_settings',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['hospital_id'],
      },
      {
        unique: true,
        fields: ['hospital_id', 'key'],
        name: 'hospital_settings_hospital_id_key_unique',
      },
    ],
  }
);

export default HospitalSetting;
