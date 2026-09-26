import hospitalAdminService from '../services/hospitalAdmin.service.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * GET /api/hospital-admin/dashboard
 * Retrieve hospital-scoped patient and staff statistics along with hospital branding
 */
export const getDashboard = async (req, res, next) => {
  try {
    const data = await hospitalAdminService.getHospitalDashboardStats(req.user.hospitalId);
    return successResponse(res, 'Hospital dashboard statistics retrieved successfully', data, 200);
  } catch (error) {
    return next(error);
  }
};

export default {
  getDashboard,
};
