import { errorResponse } from '../utils/apiResponse.js';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const ALLOWED_UPDATE_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'city',
  'state',
  'country',
  'postalCode',
  'logoUrl',
];

const FORBIDDEN_UPDATE_FIELDS = ['id', 'status', 'hospitalId', 'createdAt', 'updatedAt', 'slug'];

/**
 * Validates request body for creating a new hospital
 */
export const validateCreateHospital = (req, res, next) => {
  const errors = {};
  const {
    name,
    email,
    phone,
    address,
    city,
    state,
    country,
    postalCode,
    logoUrl,
    adminName,
    adminEmail,
    adminPassword,
  } = req.body || {};

  // Name is required
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.name = 'Hospital name is required.';
  } else if (name.trim().length < 2 || name.trim().length > 255) {
    errors.name = 'Hospital name must be between 2 and 255 characters.';
  }

  // Email (optional, but validate format if present)
  if (email !== undefined && email !== null && email !== '') {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    } else if (email.trim().length > 255) {
      errors.email = 'Email cannot exceed 255 characters.';
    }
  }

  // Admin Email (optional during hospital registration, but validate if present)
  if (adminEmail !== undefined && adminEmail !== null && adminEmail !== '') {
    if (typeof adminEmail !== 'string' || !EMAIL_REGEX.test(adminEmail.trim())) {
      errors.adminEmail = 'Please provide a valid email address for the hospital administrator.';
    } else if (adminEmail.trim().length > 255) {
      errors.adminEmail = 'Admin email cannot exceed 255 characters.';
    }
  }

  // Admin Password (optional, min 6 chars if provided)
  if (adminPassword !== undefined && adminPassword !== null && adminPassword !== '') {
    if (typeof adminPassword !== 'string' || adminPassword.length < 6) {
      errors.adminPassword = 'Admin password must be at least 6 characters.';
    }
  }

  // Phone (optional)
  if (phone !== undefined && phone !== null && phone !== '') {
    if (typeof phone !== 'string' || phone.trim().length > 50) {
      errors.phone = 'Phone number cannot exceed 50 characters.';
    }
  }

  // City (optional)
  if (city !== undefined && city !== null && city !== '') {
    if (typeof city !== 'string' || city.trim().length > 100) {
      errors.city = 'City cannot exceed 100 characters.';
    }
  }

  // State (optional)
  if (state !== undefined && state !== null && state !== '') {
    if (typeof state !== 'string' || state.trim().length > 100) {
      errors.state = 'State cannot exceed 100 characters.';
    }
  }

  // Country (optional)
  if (country !== undefined && country !== null && country !== '') {
    if (typeof country !== 'string' || country.trim().length > 100) {
      errors.country = 'Country cannot exceed 100 characters.';
    }
  }

  // Postal Code (optional)
  if (postalCode !== undefined && postalCode !== null && postalCode !== '') {
    if (typeof postalCode !== 'string' || postalCode.trim().length > 20) {
      errors.postalCode = 'Postal code cannot exceed 20 characters.';
    }
  }

  // Logo URL (optional)
  if (logoUrl !== undefined && logoUrl !== null && logoUrl !== '') {
    if (typeof logoUrl !== 'string' || logoUrl.trim().length > 500) {
      errors.logoUrl = 'Logo URL cannot exceed 500 characters.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error', 400, errors);
  }

  // Trim and sanitize inputs
  req.body = {
    name: name.trim(),
    email: email ? email.trim().toLowerCase() : null,
    phone: phone ? phone.trim() : null,
    address: address && typeof address === 'string' ? address.trim() : null,
    city: city ? city.trim() : null,
    state: state ? state.trim() : null,
    country: country ? country.trim() : 'India',
    postalCode: postalCode ? postalCode.trim() : null,
    logoUrl: logoUrl ? logoUrl.trim() : null,
    adminName: adminName && typeof adminName === 'string' ? adminName.trim() : null,
    adminEmail: adminEmail ? adminEmail.trim().toLowerCase() : null,
    adminPassword: adminPassword ? String(adminPassword) : null,
  };

  return next();
};

/**
 * Validates request body for updating hospital info (whitelist enforced)
 */
export const validateUpdateHospital = (req, res, next) => {
  const body = req.body || {};
  const receivedKeys = Object.keys(body);

  // Check for empty body
  if (receivedKeys.length === 0) {
    return errorResponse(res, 'Update request must contain at least one valid field to update.', 400);
  }

  // Check for forbidden fields
  for (const forbidden of FORBIDDEN_UPDATE_FIELDS) {
    if (forbidden in body) {
      return errorResponse(res, `Field '${forbidden}' cannot be modified directly via this endpoint.`, 400);
    }
  }

  // Filter allowed fields only
  const validFields = receivedKeys.filter((key) => ALLOWED_UPDATE_FIELDS.includes(key));
  if (validFields.length === 0) {
    return errorResponse(res, 'No valid mutable fields provided in update request.', 400);
  }

  const errors = {};
  const sanitized = {};

  if ('name' in body) {
    const name = body.name;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      errors.name = 'Hospital name cannot be empty.';
    } else if (name.trim().length < 2 || name.trim().length > 255) {
      errors.name = 'Hospital name must be between 2 and 255 characters.';
    } else {
      sanitized.name = name.trim();
    }
  }

  if ('email' in body) {
    const email = body.email;
    if (email !== null && email !== '') {
      if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        errors.email = 'Please provide a valid email address.';
      } else if (email.trim().length > 255) {
        errors.email = 'Email cannot exceed 255 characters.';
      } else {
        sanitized.email = email.trim().toLowerCase();
      }
    } else {
      sanitized.email = null;
    }
  }

  if ('phone' in body) {
    sanitized.phone = body.phone ? String(body.phone).trim() : null;
  }
  if ('address' in body) {
    sanitized.address = body.address ? String(body.address).trim() : null;
  }
  if ('city' in body) {
    sanitized.city = body.city ? String(body.city).trim() : null;
  }
  if ('state' in body) {
    sanitized.state = body.state ? String(body.state).trim() : null;
  }
  if ('country' in body) {
    sanitized.country = body.country ? String(body.country).trim() : 'India';
  }
  if ('postalCode' in body) {
    sanitized.postalCode = body.postalCode ? String(body.postalCode).trim() : null;
  }
  if ('logoUrl' in body) {
    sanitized.logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error', 400, errors);
  }

  req.body = sanitized;
  return next();
};

/**
 * Validates request body for updating hospital status (ACTIVE/INACTIVE)
 */
export const validateHospitalStatus = (req, res, next) => {
  const { status } = req.body || {};

  if (!status || typeof status !== 'string') {
    return errorResponse(res, 'Status is required.', 400);
  }

  const normalizedStatus = status.trim().toUpperCase();
  if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
    return errorResponse(res, "Status must be either 'ACTIVE' or 'INACTIVE'.", 400);
  }

  req.body.status = normalizedStatus;
  return next();
};

/**
 * Validates and normalizes hospital query parameters (pagination, search, filter)
 */
export const validateHospitalQuery = (req, res, next) => {
  let { page = 1, limit = 10, status, search, sort = 'createdAt:DESC' } = req.query;

  page = parseInt(page, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  limit = parseInt(limit, 10);
  if (isNaN(limit) || limit < 1) {
    limit = 10;
  } else if (limit > 100) {
    limit = 100; // Cap at 100
  }

  if (status) {
    status = status.toString().trim().toUpperCase();
    if (!['ACTIVE', 'INACTIVE', 'ALL'].includes(status)) {
      status = undefined;
    }
  }

  req.query = {
    page,
    limit,
    status: status === 'ALL' ? undefined : status,
    search: search ? search.toString().trim() : undefined,
    sort: sort.toString().trim(),
  };

  return next();
};

/**
 * Validates request body for adding a staff/admin user to a specific hospital
 */
export const validateCreateHospitalUser = (req, res, next) => {
  const { name, email, password, role } = req.body || {};
  const errors = {};

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.name = 'User full name is required.';
  } else if (name.trim().length < 2 || name.trim().length > 255) {
    errors.name = 'Name must be between 2 and 255 characters.';
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.email = 'A valid email address is required.';
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.password = 'Password is required and must be at least 6 characters.';
  }

  const validHospitalRoles = [
    'HOSPITAL_ADMIN',
    'DOCTOR',
    'NURSE',
    'RECEPTIONIST',
    'PHARMACIST',
    'LAB_STAFF',
  ];

  if (!role || typeof role !== 'string' || !validHospitalRoles.includes(role.trim().toUpperCase())) {
    errors.role = `Role must be one of: ${validHospitalRoles.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error', 400, errors);
  }

  req.body = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: String(password),
    role: role.trim().toUpperCase(),
  };

  return next();
};

/**
 * Validates request body for updating hospital settings / module configuration
 */
export const validateUpdateHospitalSettings = (req, res, next) => {
  const { settings } = req.body || {};

  if (!settings || (typeof settings !== 'object' && !Array.isArray(settings))) {
    return errorResponse(res, 'Settings must be an object or array of { key, value } entries.', 400);
  }

  return next();
};

export default {
  validateCreateHospital,
  validateUpdateHospital,
  validateHospitalStatus,
  validateHospitalQuery,
  validateCreateHospitalUser,
  validateUpdateHospitalSettings,
};
