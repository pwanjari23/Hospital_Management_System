import { errorResponse } from '../utils/apiResponse.js';

export const validateMedicine = (req, res, next) => {
  const { name, status } = req.body;
  const errors = {};

  if (req.method === 'POST' || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Medicine name is required';
    }
  }

  if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status)) {
    errors.status = 'Status must be ACTIVE or INACTIVE';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateInvestigation = (req, res, next) => {
  const { name, defaultCharge, status } = req.body;
  const errors = {};

  if (req.method === 'POST' || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Investigation name is required';
    }
  }

  if (defaultCharge !== undefined && defaultCharge !== '' && defaultCharge !== null) {
    const charge = parseFloat(defaultCharge);
    if (isNaN(charge) || charge < 0) {
      errors.defaultCharge = 'Default charge cannot be negative';
    }
  }

  if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status)) {
    errors.status = 'Status must be ACTIVE or INACTIVE';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateTreatment = (req, res, next) => {
  const { name, defaultCharge, status } = req.body;
  const errors = {};

  if (req.method === 'POST' || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Treatment name is required';
    }
  }

  if (defaultCharge !== undefined && defaultCharge !== '' && defaultCharge !== null) {
    const charge = parseFloat(defaultCharge);
    if (isNaN(charge) || charge < 0) {
      errors.defaultCharge = 'Default charge cannot be negative';
    }
  }

  if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status)) {
    errors.status = 'Status must be ACTIVE or INACTIVE';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateEecpPackage = (req, res, next) => {
  const { name, numberOfSessions, packagePrice, sessionDuration, status } = req.body;
  const errors = {};

  if (req.method === 'POST' || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Package name is required';
    }
  }

  if (numberOfSessions !== undefined && numberOfSessions !== '' && numberOfSessions !== null) {
    const sessions = parseInt(numberOfSessions, 10);
    if (isNaN(sessions) || sessions < 1) {
      errors.numberOfSessions = 'Number of sessions must be at least 1';
    }
  }

  if (packagePrice !== undefined && packagePrice !== '' && packagePrice !== null) {
    const price = parseFloat(packagePrice);
    if (isNaN(price) || price < 0) {
      errors.packagePrice = 'Package price cannot be negative';
    }
  }

  if (sessionDuration !== undefined && sessionDuration !== '' && sessionDuration !== null) {
    const duration = parseInt(sessionDuration, 10);
    if (isNaN(duration) || duration < 1) {
      errors.sessionDuration = 'Session duration must be at least 1 minute';
    }
  }

  if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status)) {
    errors.status = 'Status must be ACTIVE or INACTIVE';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validatePaymentMode = (req, res, next) => {
  const { name, status } = req.body;
  const errors = {};

  if (req.method === 'POST' || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Payment mode name is required';
    }
  }

  if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status)) {
    errors.status = 'Status must be ACTIVE or INACTIVE';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateMasterStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
    return errorResponse(res, 'Status must be ACTIVE or INACTIVE', 400);
  }
  return next();
};

export default {
  validateMedicine,
  validateInvestigation,
  validateTreatment,
  validateEecpPackage,
  validatePaymentMode,
  validateMasterStatus,
};
