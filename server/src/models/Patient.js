import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { calculateAge, getNumericAge } from '../utils/age.js';

export class Patient extends Model {
  get fullName() {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }

  get age() {
    return calculateAge(this.dateOfBirth);
  }

  get numericAge() {
    return getNumericAge(this.dateOfBirth);
  }

  toJSON() {
    const values = { ...this.get() };
    values.fullName = this.fullName;
    values.age = this.age;
    values.numericAge = this.numericAge;
    return values;
  }
}

Patient.init(
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
        notNull: { msg: 'Patient must be associated with a valid hospital' },
      },
    },
    uhid: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'UHID is required' },
      },
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
      validate: {
        notEmpty: { msg: 'First name is required' },
        len: { args: [1, 100], msg: 'First name cannot exceed 100 characters' },
      },
    },
    middleName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'middle_name',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
      validate: {
        notEmpty: { msg: 'Last name is required' },
        len: { args: [1, 100], msg: 'Last name cannot exceed 100 characters' },
      },
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_of_birth',
      validate: {
        notEmpty: { msg: 'Date of birth is required' },
        isDate: { msg: 'Must be a valid date' },
        isNotFuture(value) {
          if (new Date(value) > new Date()) {
            throw new Error('Date of birth cannot be in the future');
          }
        },
      },
    },
    gender: {
      type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']],
          msg: 'Gender must be MALE, FEMALE, OTHER, or PREFER_NOT_TO_SAY',
        },
      },
    },
    bloodGroup: {
      type: DataTypes.ENUM(
        'A_POSITIVE',
        'A_NEGATIVE',
        'B_POSITIVE',
        'B_NEGATIVE',
        'AB_POSITIVE',
        'AB_NEGATIVE',
        'O_POSITIVE',
        'O_NEGATIVE',
        'UNKNOWN'
      ),
      allowNull: false,
      defaultValue: 'UNKNOWN',
      field: 'blood_group',
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Phone number is required' },
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmailIfProvided(value) {
          if (value && value.trim() !== '') {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(value.trim())) {
              throw new Error('Please enter a valid email address');
            }
          }
        },
      },
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
    emergencyContactName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'emergency_contact_name',
    },
    emergencyContactPhone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'emergency_contact_phone',
    },
    emergencyContactRelation: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'emergency_contact_relation',
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    medicalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'medical_notes',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'Patient',
    tableName: 'patients',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hospital_id', 'uhid'],
      },
      {
        fields: ['hospital_id'],
      },
      {
        fields: ['hospital_id', 'phone'],
      },
      {
        fields: ['hospital_id', 'is_active'],
      },
      {
        fields: ['hospital_id', 'created_at'],
      },
    ],
    hooks: {
      beforeValidate: (patient) => {
        if (patient.firstName && typeof patient.firstName === 'string') {
          patient.firstName = patient.firstName.trim();
        }
        if (patient.middleName && typeof patient.middleName === 'string') {
          patient.middleName = patient.middleName.trim() || null;
        }
        if (patient.lastName && typeof patient.lastName === 'string') {
          patient.lastName = patient.lastName.trim();
        }
        if (patient.email && typeof patient.email === 'string') {
          patient.email = patient.email.trim().toLowerCase() || null;
        }
        if (patient.phone && typeof patient.phone === 'string') {
          patient.phone = patient.phone.trim();
        }
      },
    },
  }
);

export default Patient;
