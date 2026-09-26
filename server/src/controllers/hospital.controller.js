import hospitalService from '../services/hospital.service.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * GET /api/hospitals
 * Retrieve paginated list of hospitals
 */
export const getHospitals = async (req, res, next) => {
  try {
    const result = await hospitalService.getHospitals(req.query);
    return successResponse(res, 'Hospitals retrieved successfully', result, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/hospitals/:id
 * Retrieve single hospital by UUID
 */
export const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await hospitalService.getHospitalById(req.params.id);
    return successResponse(res, 'Hospital retrieved successfully', hospital, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/hospitals
 * Create a new hospital and initial settings
 */
export const createHospital = async (req, res, next) => {
  try {
    const hospital = await hospitalService.createHospital(req.body);
    return successResponse(res, 'Hospital created successfully', hospital, 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/hospitals/:id
 * Update hospital details (whitelisted mutable fields)
 */
export const updateHospital = async (req, res, next) => {
  try {
    const hospital = await hospitalService.updateHospital(req.params.id, req.body);
    return successResponse(res, 'Hospital updated successfully', hospital, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/hospitals/:id/status
 * Transition hospital status (ACTIVE <-> INACTIVE)
 */
export const updateHospitalStatus = async (req, res, next) => {
  try {
    const hospital = await hospitalService.updateHospitalStatus(req.params.id, req.body.status);
    const actionLabel = req.body.status === 'ACTIVE' ? 'activated' : 'deactivated';
    return successResponse(res, `Hospital ${actionLabel} successfully`, hospital, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/hospitals/:id/users
 * Retrieve all users belonging to a specific hospital tenant
 */
export const getHospitalUsers = async (req, res, next) => {
  try {
    const users = await hospitalService.getHospitalUsers(req.params.id);
    return successResponse(res, 'Hospital users retrieved successfully', users, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/hospitals/:id/users
 * Create a new user/staff member under a specific hospital tenant
 */
export const createHospitalUser = async (req, res, next) => {
  try {
    const user = await hospitalService.createHospitalUser(req.params.id, req.body);
    return successResponse(res, 'Hospital staff user created successfully', user, 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/hospitals/:id/settings
 * Update tenant settings and module configuration flags
 */
export const updateHospitalSettings = async (req, res, next) => {
  try {
    const settings = await hospitalService.updateHospitalSettings(req.params.id, req.body.settings);
    return successResponse(res, 'Hospital settings updated successfully', settings, 200);
  } catch (error) {
    return next(error);
  }
};

export default {
  getHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  updateHospitalStatus,
  getHospitalUsers,
  createHospitalUser,
  updateHospitalSettings,
};
