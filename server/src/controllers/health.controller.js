import { successResponse } from '../utils/apiResponse.js';

/**
 * Health check controller
 * Simple check to confirm the HMS API server is active and responding.
 */
export const getHealth = (req, res) => {
  return successResponse(res, 'HMS API is running', null, 200);
};

export default {
  getHealth,
};
