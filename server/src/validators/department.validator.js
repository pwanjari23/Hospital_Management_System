import { errorResponse } from '../utils/apiResponse.js';

export const validateCreateDepartment = (req, res, next) => {
  const { name, code, description, status } = req.body;
  const errors = {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.name = 'Department name is required';
  } else if (name.trim().length < 2 || name.trim().length > 100) {
    errors.name = 'Department name must be between 2 and 100 characters';
  }

  if (code && typeof code === 'string' && code.trim().length > 50) {
    errors.code = 'Department code cannot exceed 50 characters';
  }

  if (description && typeof description === 'string' && description.trim().length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters';
  }

  if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
    errors.status = 'Status must be ACTIVE or INACTIVE';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdateDepartment = (req, res, next) => {
  const { name, code, description, status } = req.body;
  const errors = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      errors.name = 'Department name cannot be empty';
    } else if (name.trim().length < 2 || name.trim().length > 100) {
      errors.name = 'Department name must be between 2 and 100 characters';
    }
  }

  if (code !== undefined && code !== null && typeof code === 'string' && code.trim().length > 50) {
    errors.code = 'Department code cannot exceed 50 characters';
  }

  if (description !== undefined && description !== null && typeof description === 'string' && description.trim().length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters';
  }

  if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status)) {
    errors.status = 'Status must be ACTIVE or INACTIVE';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateDepartmentStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
    return errorResponse(res, 'Status must be ACTIVE or INACTIVE', 400);
  }
  return next();
};

export default {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateDepartmentStatus,
};
