import dashboardService from '../services/dashboard.service.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * GET /api/super-admin/dashboard
 * Retrieve aggregate dashboard metrics for Super Admin
 */
export const getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getSuperAdminDashboardMetrics();
    return successResponse(res, 'Dashboard metrics retrieved successfully', data, 200);
  } catch (error) {
    return next(error);
  }
};

export default {
  getDashboard,
};
