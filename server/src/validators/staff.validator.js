import { errorResponse } from '../utils/apiResponse.js';
import { ALLOWED_HOSPITAL_ROLES } from '../services/staff.service.js';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[+0-9\s\-().]{7,30}$/;

export const validateCreateStaff = (req, res, next) => {
  const { name, email, password, role, phone, consultationFee } = req.body;
  const errors = {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.name = 'Full name is required';
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please provide a valid email address';
  }

  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!role || typeof role !== 'string') {
    errors.role = 'Role assignment is required';
  } else if (!ALLOWED_HOSPITAL_ROLES.includes(role.toUpperCase())) {
    errors.role = `Role must be one of: ${ALLOWED_HOSPITAL_ROLES.join(', ')}`;
  }

  if (phone && typeof phone === 'string' && phone.trim() !== '' && !PHONE_REGEX.test(phone.trim())) {
    errors.phone = 'Please provide a valid phone number';
  }

  if (consultationFee !== undefined && consultationFee !== '' && consultationFee !== null) {
    const feeNum = parseFloat(consultationFee);
    if (isNaN(feeNum) || feeNum < 0) {
      errors.consultationFee = 'Consultation fee cannot be negative';
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdateStaff = (req, res, next) => {
  const { name, email, password, role, phone, consultationFee, status } = req.body;
  const errors = {};

  if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
    errors.name = 'Full name cannot be empty';
  }

  if (email !== undefined) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.email = 'Email address cannot be empty';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please provide a valid email address';
    }
  }

  if (password !== undefined && password !== '') {
    if (typeof password !== 'string' || password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
  }

  if (role !== undefined && !ALLOWED_HOSPITAL_ROLES.includes(role?.toUpperCase())) {
    errors.role = `Role must be one of: ${ALLOWED_HOSPITAL_ROLES.join(', ')}`;
  }

  if (phone && typeof phone === 'string' && phone.trim() !== '' && !PHONE_REGEX.test(phone.trim())) {
    errors.phone = 'Please provide a valid phone number';
  }

  if (consultationFee !== undefined && consultationFee !== '' && consultationFee !== null) {
    const feeNum = parseFloat(consultationFee);
    if (isNaN(feeNum) || feeNum < 0) {
      errors.consultationFee = 'Consultation fee cannot be negative';
    }
  }

  if (status !== undefined && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    errors.status = 'Status must be ACTIVE, INACTIVE, or SUSPENDED';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateStaffStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    return errorResponse(res, 'Status must be ACTIVE, INACTIVE, or SUSPENDED', 400);
  }
  return next();
};

export default {
  validateCreateStaff,
  validateUpdateStaff,
  validateStaffStatus,
};
