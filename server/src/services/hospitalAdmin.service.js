import { Op } from 'sequelize';
import { Patient, User, Role, Hospital, HospitalSetting } from '../models/index.js';

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
    attributes: ['id', 'name', 'slug', 'email', 'phone', 'logoUrl', 'city', 'status'],
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

export default {
  getHospitalDashboardStats,
};
