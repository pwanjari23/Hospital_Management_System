import departmentService from '../services/department.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getDepartments = async (req, res, next) => {
  try {
    const result = await departmentService.getDepartments(req.user.hospitalId, req.query);
    return successResponse(res, 'Departments retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const department = await departmentService.getDepartmentById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Department retrieved successfully', department);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.createDepartment(req.user.hospitalId, req.body);
    return successResponse(res, 'Department created successfully', department, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.updateDepartment(req.user.hospitalId, req.params.id, req.body);
    return successResponse(res, 'Department updated successfully', department);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateDepartmentStatus = async (req, res, next) => {
  try {
    const department = await departmentService.updateDepartmentStatus(
      req.user.hospitalId,
      req.params.id,
      req.body.status
    );
    return successResponse(res, `Department status updated to ${req.body.status}`, department);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  updateDepartmentStatus,
};
