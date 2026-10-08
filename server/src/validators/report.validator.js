import { errorResponse } from '../utils/apiResponse.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_PRESETS = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'this_quarter',
  'this_year',
  'custom',
];

export const validateReportQuery = (req, res, next) => {
  const { preset, startDate, endDate, page, limit } = req.query;
  const errors = [];

  if (preset && !VALID_PRESETS.includes(preset)) {
    errors.push(`Preset must be one of: ${VALID_PRESETS.join(', ')}`);
  }

  if (startDate && !DATE_REGEX.test(startDate)) {
    errors.push('startDate must be in YYYY-MM-DD format');
  }

  if (endDate && !DATE_REGEX.test(endDate)) {
    errors.push('endDate must be in YYYY-MM-DD format');
  }

  if (startDate && endDate && startDate > endDate) {
    errors.push('startDate cannot be after endDate');
  }

  if (page && (isNaN(page) || parseInt(page, 10) < 1)) {
    errors.push('page must be a positive integer');
  }

  if (limit && (isNaN(limit) || parseInt(limit, 10) < 1 || parseInt(limit, 10) > 100)) {
    errors.push('limit must be between 1 and 100');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export default {
  validateReportQuery,
};
