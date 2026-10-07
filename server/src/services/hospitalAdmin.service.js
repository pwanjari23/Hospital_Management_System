import { Op } from 'sequelize';
import { Patient, User, Role, Hospital, HospitalSetting } from '../models/index.js';
import withTransaction from '../utils/transaction.js';

/**
 * Aggregates live patient and staff metrics for a specific hospital tenant
 * @param {string} hospitalId - Tenant ID
 */
export const getHospitalDashboardStats = async (hospitalId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Patient metrics (strictly database-driven, no fabricated figures)
  const [totalPatients, activePatients, inactivePatients, newPatientsThisMonth] =
    await Promise.all([
      Patient.count({ where: { hospitalId } }),
      Patient.count({ where: { hospitalId, isActive: true } }),
      Patient.count({ where: { hospitalId, isActive: false } }),
      Patient.count({
        where: {
          hospitalId,
          createdAt: { [Op.gte]: startOfMonth },
        },
      }),
    ]);

  // 2. Staff metrics for this hospital
  const totalStaff = await User.count({ where: { hospitalId } });

  const doctorRole = await Role.findOne({ where: { name: 'DOCTOR', scope: 'HOSPITAL' } });
  const totalDoctors = doctorRole
    ? await doctorRole.countUsers({ where: { hospitalId } })
    : 0;

  const nurseRole = await Role.findOne({ where: { name: 'NURSE', scope: 'HOSPITAL' } });
  const totalNurses = nurseRole
    ? await nurseRole.countUsers({ where: { hospitalId } })
    : 0;

  const receptionistRole = await Role.findOne({
    where: { name: 'RECEPTIONIST', scope: 'HOSPITAL' },
  });
  const totalReceptionists = receptionistRole
    ? await receptionistRole.countUsers({ where: { hospitalId } })
    : 0;

  // 3. Recent patient registrations
  const recentPatients = await Patient.findAll({
    where: { hospitalId },
    limit: 5,
    order: [['createdAt', 'DESC']],
    attributes: [
      'id',
      'uhid',
      'firstName',
      'middleName',
      'lastName',
      'dateOfBirth',
      'gender',
      'bloodGroup',
      'phone',
      'isActive',
      'createdAt',
    ],
  });

  // 4. Hospital tenant details & branding
  const hospital = await Hospital.findByPk(hospitalId, {
    attributes: [
      'id',
      'name',
      'slug',
      'email',
      'phone',
      'alternatePhone',
      'website',
      'address',
      'city',
      'state',
      'country',
      'postalCode',
      'workingHours',
      'timezone',
      'currency',
      'logoUrl',
      'status',
    ],
    include: [
      {
        model: HospitalSetting,
        as: 'settings',
        attributes: ['key', 'value'],
      },
    ],
  });

  return {
    metrics: {
      totalPatients,
      activePatients,
      inactivePatients,
      newPatientsThisMonth,
      totalStaff,
      totalDoctors,
      totalNurses,
      totalReceptionists,
    },
    patientStats: {
      totalPatients,
      activePatients,
      inactivePatients,
      newThisMonth: newPatientsThisMonth,
    },
    staffStats: {
      totalStaff,
      doctors: totalDoctors,
      nurses: totalNurses,
      receptionists: totalReceptionists,
    },
    recentPatients,
    hospital,
  };
};

/**
 * Get comprehensive settings dictionary and hospital profile for the tenant
 */
export const getHospitalSettings = async (hospitalId, options = {}) => {
  const hospital = await Hospital.findByPk(hospitalId, {
    attributes: [
      'id',
      'name',
      'slug',
      'email',
      'phone',
      'alternatePhone',
      'website',
      'address',
      'city',
      'state',
      'country',
      'postalCode',
      'workingHours',
      'timezone',
      'currency',
      'logoUrl',
      'status',
    ],
    ...options,
  });

  if (!hospital) {
    const error = new Error('Hospital tenant not found.');
    error.statusCode = 404;
    throw error;
  }

  const rawSettings = await HospitalSetting.findAll({
    where: { hospitalId },
    attributes: ['key', 'value'],
    ...options,
  });

  const settingsMap = {};
  for (const s of rawSettings) {
    settingsMap[s.key] = s.value;
  }

  return {
    hospital,
    settings: settingsMap,
  };
};

/**
 * Update Hospital Profile fields
 */
export const updateHospitalProfile = async (hospitalId, data) => {
  const hospital = await Hospital.findByPk(hospitalId);
  if (!hospital) {
    const error = new Error('Hospital tenant not found.');
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = [
    'name',
    'phone',
    'alternatePhone',
    'email',
    'website',
    'address',
    'city',
    'state',
    'country',
    'postalCode',
    'workingHours',
    'timezone',
    'currency',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      hospital[field] = typeof data[field] === 'string' ? data[field].trim() || null : data[field];
    }
  }

  await hospital.save();
  return getHospitalSettings(hospitalId);
};

/**
 * Bulk upsert settings in HospitalSetting table for tenant
 */
export const updateHospitalSettingsMap = async (hospitalId, settingsMap) => {
  return withTransaction(async (t) => {
    for (const [key, value] of Object.entries(settingsMap)) {
      if (!key) continue;
      const strVal = value !== null && value !== undefined ? String(value) : '';
      const existing = await HospitalSetting.findOne({
        where: { hospitalId, key },
        transaction: t,
      });

      if (existing) {
        await existing.update({ value: strVal }, { transaction: t });
      } else {
        await HospitalSetting.create({ hospitalId, key, value: strVal }, { transaction: t });
      }
    }

    return getHospitalSettings(hospitalId, { transaction: t });
  });
};

export default {
  getHospitalDashboardStats,
  getHospitalSettings,
  updateHospitalProfile,
  updateHospitalSettingsMap,
};
