import doctorLeaveService from '../services/doctorLeave.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const listLeaves = async (req, res, next) => {
  try {
    const leaves = await doctorLeaveService.getDoctorLeaves(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Doctor leaves retrieved successfully', leaves);
  } catch (error) {
    return next(error);
  }
};

export const getLeave = async (req, res, next) => {
  try {
    const leave = await doctorLeaveService.getDoctorLeaveById(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Doctor leave retrieved successfully', leave);
  } catch (error) {
    return next(error);
  }
};

export const createLeave = async (req, res, next) => {
  try {
    const leave = await doctorLeaveService.createDoctorLeave(
      req.user.hospitalId,
      req.body
    );
    return successResponse(res, 'Doctor leave recorded successfully', leave, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateLeave = async (req, res, next) => {
  try {
    const leave = await doctorLeaveService.updateDoctorLeave(
      req.user.hospitalId,
      req.params.id,
      req.body
    );
    return successResponse(res, 'Doctor leave updated successfully', leave);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const toggleLeaveStatus = async (req, res, next) => {
  try {
    const leave = await doctorLeaveService.toggleDoctorLeaveStatus(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Doctor leave status updated successfully', leave);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const deleteLeave = async (req, res, next) => {
  try {
    const result = await doctorLeaveService.deleteDoctorLeave(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, result.message, null);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  listLeaves,
  getLeave,
  createLeave,
  updateLeave,
  toggleLeaveStatus,
  deleteLeave,
};
