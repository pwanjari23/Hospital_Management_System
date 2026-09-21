import env from '../config/env.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Centralized application error handling middleware.
 * Ensures internal details and stack traces are never exposed in production.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  // Log detailed error stack to server console in development
  if (env.isDevelopment) {
    console.error('API Error:', err);
  }

  const message =
    statusCode === 500 && env.isProduction
      ? 'Internal server error'
      : err.message || 'Something went wrong';

  return errorResponse(res, message, statusCode);
};

export default errorHandler;
