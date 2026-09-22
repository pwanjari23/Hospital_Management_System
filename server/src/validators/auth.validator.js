import { errorResponse } from '../utils/apiResponse.js';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates login request body
 */
export const validateLogin = (req, res, next) => {
  const errors = {};
  let { email, password } = req.body || {};

  // Email validation
  if (email === undefined || email === null || typeof email !== 'string' || email.trim() === '') {
    errors.email = 'Email address is required.';
  } else {
    email = email.trim().toLowerCase();
    if (email.length > 255) {
      errors.email = 'Email address cannot exceed 255 characters.';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Please provide a valid email address.';
    }
  }

  // Password validation
  if (
    password === undefined ||
    password === null ||
    typeof password !== 'string' ||
    password === ''
  ) {
    errors.password = 'Password is required.';
  } else if (password.length > 128) {
    errors.password = 'Password cannot exceed 128 characters.';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error', 400, errors);
  }

  // Normalize email on request body
  req.body.email = email;

  return next();
};

export default {
  validateLogin,
};
