import { errorResponse } from '../utils/apiResponse.js';

const VALID_PRIORITIES = ['ROUTINE', 'URGENT'];

export const validateCreateInvestigationOrder = (req, res, next) => {
  const { investigationId, priority, items } = req.body;
  const errors = {};

  if (!items) {
    if (!investigationId) {
      errors.investigationId = 'Investigation is required';
    }
    if (priority && !VALID_PRIORITIES.includes(priority.toUpperCase())) {
      errors.priority = 'Priority must be ROUTINE or URGENT';
    }
  } else if (!Array.isArray(items) || items.length === 0) {
    errors.items = 'Items must be a non-empty array of investigations';
  } else {
    items.forEach((item, index) => {
      if (!item.investigationId) {
        errors[`items[${index}].investigationId`] = 'Investigation is required for each order';
      }
      if (item.priority && !VALID_PRIORITIES.includes(item.priority.toUpperCase())) {
        errors[`items[${index}].priority`] = 'Priority must be ROUTINE or URGENT';
      }
    });
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdateInvestigationOrder = (req, res, next) => {
  const { priority } = req.body;
  const errors = {};

  if (priority && !VALID_PRIORITIES.includes(priority.toUpperCase())) {
    errors.priority = 'Priority must be ROUTINE or URGENT';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export default {
  validateCreateInvestigationOrder,
  validateUpdateInvestigationOrder,
};
