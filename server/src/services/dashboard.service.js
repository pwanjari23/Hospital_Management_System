import { Op } from 'sequelize';
import { Hospital } from '../models/index.js';

/**
 * Retrieve aggregate dashboard metrics for Platform Super Admin
 */
export const getSuperAdminDashboardMetrics = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalHospitals, activeHospitals, inactiveHospitals, addedThisMonth, recentHospitals] =
    await Promise.all([
      Hospital.count(),
      Hospital.count({ where: { status: 'ACTIVE' } }),
      Hospital.count({ where: { status: 'INACTIVE' } }),
      Hospital.count({
        where: {
          createdAt: {
            [Op.gte]: startOfMonth,
          },
        },
      }),
      Hospital.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        attributes: [
          'id',
          'name',
          'slug',
          'city',
          'state',
          'country',
          'email',
          'phone',
          'status',
          'createdAt',
          'logoUrl',
        ],
      }),
    ]);

  return {
    metrics: {
      totalHospitals,
      activeHospitals,
      inactiveHospitals,
      addedThisMonth,
    },
    recentHospitals,
  };
};

export default {
  getSuperAdminDashboardMetrics,
};
