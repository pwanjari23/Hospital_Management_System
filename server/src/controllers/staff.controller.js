import staffService from '../services/staff.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getStaff = async (req, res, next) => {
  try {
    const result = await staffService.getStaff(req.user.hospitalId, req.query);
    return successResponse(res, 'Staff members retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const getStaffById = async (req, res, next) => {
  try {
    const staff = await staffService.getStaffById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Staff member retrieved successfully', staff);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const createStaff = async (req, res, next) => {
  try {
    const staff = await staffService.createStaff(req.user.hospitalId, req.body);
    return successResponse(res, 'Staff member created successfully', staff, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateStaff = async (req, res, next) => {
  try {
    const staff = await staffService.updateStaff(req.user.hospitalId, req.params.id, req.body);
    return successResponse(res, 'Staff member updated successfully', staff);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateStaffStatus = async (req, res, next) => {
  try {
    const staff = await staffService.updateStaffStatus(req.user.hospitalId, req.params.id, req.body.status);
    return successResponse(res, `Staff member status updated to ${req.body.status}`, staff);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  updateStaffStatus,
};
