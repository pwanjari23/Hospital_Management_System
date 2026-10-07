import { errorResponse } from '../utils/apiResponse.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const validateCreateLeave = (req, res, next) => {
  const { doctorId, startDate, endDate, reason } = req.body;
  const errors = {};

  if (!doctorId || typeof doctorId !== 'string') {
    errors.doctorId = 'Doctor is required';
  }

  if (!startDate || !DATE_REGEX.test(startDate)) {
    errors.startDate = 'Start date is required and must be in YYYY-MM-DD format';
  }

  if (!endDate || !DATE_REGEX.test(endDate)) {
    errors.endDate = 'End date is required and must be in YYYY-MM-DD format';
  }

  if (startDate && endDate && DATE_REGEX.test(startDate) && DATE_REGEX.test(endDate)) {
    if (new Date(startDate) > new Date(endDate)) {
      errors.endDate = 'End date cannot be earlier than start date';
    }
  }

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    errors.reason = 'Reason for leave is required';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdateLeave = (req, res, next) => {
  const { startDate, endDate, reason } = req.body;
  const errors = {};

  if (startDate && !DATE_REGEX.test(startDate)) {
    errors.startDate = 'Start date must be in YYYY-MM-DD format';
  }

  if (endDate && !DATE_REGEX.test(endDate)) {
    errors.endDate = 'End date must be in YYYY-MM-DD format';
  }

  if (startDate && endDate && DATE_REGEX.test(startDate) && DATE_REGEX.test(endDate)) {
    if (new Date(startDate) > new Date(endDate)) {
      errors.endDate = 'End date cannot be earlier than start date';
    }
  }

  if (reason !== undefined && (!reason || !reason.trim())) {
    errors.reason = 'Reason cannot be empty';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export default {
  validateCreateLeave,
  validateUpdateLeave,
};
