import { errorResponse } from '../utils/apiResponse.js';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[+0-9\s\-().]{7,30}$/;

export const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

export const VALID_BLOOD_GROUPS = [
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
  'UNKNOWN',
];

const ALLOWED_ADMIN_UPDATE_FIELDS = [
  'firstName',
  'middleName',
  'lastName',
  'dateOfBirth',
  'gender',
  'bloodGroup',
  'phone',
  'email',
  'address',
  'city',
  'state',
  'country',
  'postalCode',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelation',
  'allergies',
  'medicalNotes',
];

const ALLOWED_RECEPTIONIST_UPDATE_FIELDS = [
  'firstName',
  'middleName',
  'lastName',
  'dateOfBirth',
  'gender',
  'bloodGroup',
  'phone',
  'email',
  'address',
  'city',
  'state',
  'country',
  'postalCode',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelation',
];

const FORBIDDEN_FIELDS = ['id', 'hospitalId', 'uhid', 'isActive', 'createdAt', 'updatedAt'];

/**
 * Validates patient registration payload (POST /api/patients)
 */
export const validateCreatePatient = (req, res, next) => {
  const errors = {};
  const body = req.body || {};

  const {
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    gender,
    bloodGroup,
    phone,
    email,
    postalCode,
  } = body;

  // First Name validation
  if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
    errors.firstName = 'First name is required.';
  } else if (firstName.trim().length > 100) {
    errors.firstName = 'First name cannot exceed 100 characters.';
  }

  // Middle Name validation
  if (middleName !== undefined && middleName !== null && typeof middleName === 'string') {
    if (middleName.trim().length > 100) {
      errors.middleName = 'Middle name cannot exceed 100 characters.';
    }
  }

  // Last Name validation
  if (!lastName || typeof lastName !== 'string' || lastName.trim() === '') {
    errors.lastName = 'Last name is required.';
  } else if (lastName.trim().length > 100) {
    errors.lastName = 'Last name cannot exceed 100 characters.';
  }

  // Date of Birth validation
  if (!dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required.';
  } else {
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Please provide a valid date of birth (YYYY-MM-DD).';
    } else if (dob > new Date()) {
      errors.dateOfBirth = 'Date of birth cannot be in the future.';
    }
  }

  // Gender validation
  if (!gender) {
    errors.gender = 'Gender is required.';
  } else if (!VALID_GENDERS.includes(gender)) {
    errors.gender = `Gender must be one of: ${VALID_GENDERS.join(', ')}.`;
  }

  // Blood Group validation (optional, default UNKNOWN)
  if (bloodGroup !== undefined && bloodGroup !== null && bloodGroup !== '') {
    if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      errors.bloodGroup = `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}.`;
    }
  }

  // Phone validation
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    errors.phone = 'Phone number is required.';
  } else if (!PHONE_REGEX.test(phone.trim())) {
    errors.phone = 'Please provide a valid contact phone number (7-30 characters).';
  }

  // Email validation (optional)
  if (email !== undefined && email !== null && email.trim() !== '') {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    } else if (email.trim().length > 255) {
      errors.email = 'Email cannot exceed 255 characters.';
    }
  }

  // Postal Code validation
  if (postalCode !== undefined && postalCode !== null && postalCode !== '') {
    if (typeof postalCode !== 'string' || postalCode.trim().length > 20) {
      errors.postalCode = 'Postal code cannot exceed 20 characters.';
    }
  }

  // Strip forbidden fields from body to ensure mass assignment protection
  FORBIDDEN_FIELDS.forEach((field) => {
    delete req.body[field];
  });

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Patient validation failed', 400, errors);
  }

  return next();
};

/**
 * Validates patient update payload (PATCH /api/patients/:id)
 */
export const validateUpdatePatient = (req, res, next) => {
  const body = req.body || {};
  const userRole = req.user?.role;

  // 1. Reject empty update body
  const bodyKeys = Object.keys(body);
  if (bodyKeys.length === 0) {
    return errorResponse(res, 'Update payload cannot be empty.', 400);
  }

  // 2. Reject attempts to modify forbidden metadata
  const forbiddenPassed = bodyKeys.filter((k) => FORBIDDEN_FIELDS.includes(k));
  if (forbiddenPassed.length > 0) {
    return errorResponse(
      res,
      `Modifying immutable system fields (${forbiddenPassed.join(', ')}) is strictly prohibited.`,
      400
    );
  }

  // 3. Determine whitelist by role
  const isReceptionist = userRole === 'RECEPTIONIST';
  const allowedFields = isReceptionist ? ALLOWED_RECEPTIONIST_UPDATE_FIELDS : ALLOWED_ADMIN_UPDATE_FIELDS;

  // If receptionist attempts to modify clinical fields
  if (isReceptionist && (body.allergies !== undefined || body.medicalNotes !== undefined)) {
    return errorResponse(
      res,
      'Access denied: Receptionists cannot modify clinical medical information.',
      403
    );
  }

  // Filter keys against allowed fields
  const invalidKeys = bodyKeys.filter((k) => !allowedFields.includes(k));
  if (invalidKeys.length > 0) {
    return errorResponse(
      res,
      `Unknown or unauthorized fields in update payload: ${invalidKeys.join(', ')}`,
      400
    );
  }

  const errors = {};

  if (body.firstName !== undefined) {
    if (typeof body.firstName !== 'string' || body.firstName.trim() === '') {
      errors.firstName = 'First name cannot be empty.';
    } else if (body.firstName.trim().length > 100) {
      errors.firstName = 'First name cannot exceed 100 characters.';
    }
  }

  if (body.lastName !== undefined) {
    if (typeof body.lastName !== 'string' || body.lastName.trim() === '') {
      errors.lastName = 'Last name cannot be empty.';
    } else if (body.lastName.trim().length > 100) {
      errors.lastName = 'Last name cannot exceed 100 characters.';
    }
  }

  if (body.dateOfBirth !== undefined) {
    const dob = new Date(body.dateOfBirth);
    if (isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Please provide a valid date of birth (YYYY-MM-DD).';
    } else if (dob > new Date()) {
      errors.dateOfBirth = 'Date of birth cannot be in the future.';
    }
  }

  if (body.gender !== undefined && !VALID_GENDERS.includes(body.gender)) {
    errors.gender = `Gender must be one of: ${VALID_GENDERS.join(', ')}.`;
  }

  if (body.bloodGroup !== undefined && body.bloodGroup !== null && body.bloodGroup !== '') {
    if (!VALID_BLOOD_GROUPS.includes(body.bloodGroup)) {
      errors.bloodGroup = `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}.`;
    }
  }

  if (body.phone !== undefined) {
    if (typeof body.phone !== 'string' || body.phone.trim() === '') {
      errors.phone = 'Phone number cannot be empty.';
    } else if (!PHONE_REGEX.test(body.phone.trim())) {
      errors.phone = 'Please provide a valid contact phone number (7-30 characters).';
    }
  }

  if (body.email !== undefined && body.email !== null && body.email.trim() !== '') {
    if (typeof body.email !== 'string' || !EMAIL_REGEX.test(body.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Patient update validation failed', 400, errors);
  }

  return next();
};

/**
 * Validates status toggle payload (PATCH /api/patients/:id/status)
 */
export const validatePatientStatus = (req, res, next) => {
  const { isActive } = req.body || {};

  if (isActive === undefined || typeof isActive !== 'boolean') {
    return errorResponse(
      res,
      'Status payload must contain a boolean "isActive" property (true or false).',
      400
    );
  }

  return next();
};

export default {
  validateCreatePatient,
  validateUpdatePatient,
  validatePatientStatus,
  VALID_GENDERS,
  VALID_BLOOD_GROUPS,
};
