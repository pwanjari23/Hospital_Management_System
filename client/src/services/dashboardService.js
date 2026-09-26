import api from './api';

/**
 * Fetch platform-level dashboard summary metrics and recent hospitals
 * @returns {Promise<{ metrics: { totalHospitals: number, activeHospitals: number, inactiveHospitals: number, addedThisMonth: number }, recentHospitals: Array }>}
 */
export const getDashboardStats = async () => {
  const response = await api.get('/super-admin/dashboard');
  return response.data?.data;
};

export default {
  getDashboardStats,
};
