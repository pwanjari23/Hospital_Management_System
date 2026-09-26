import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export class HospitalSequence extends Model {}

HospitalSequence.init(
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
      onDelete: 'CASCADE',
    },
    sequenceType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'PATIENT',
      field: 'sequence_type',
    },
    prefix: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'HOSP',
    },
    lastValue: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      field: 'last_value',
    },
  },
  {
    sequelize,
    modelName: 'HospitalSequence',
    tableName: 'hospital_sequences',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'sequence_type'],
      },
    ],
  }
);

export default HospitalSequence;
