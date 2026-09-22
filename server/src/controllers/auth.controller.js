import authService from '../services/auth.service.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * Handle Super Admin login
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginSuperAdmin(email, password);
    return successResponse(res, 'Login successful', result, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * Retrieve authenticated user profile
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const userProfile = await authService.getCurrentUser(req.user.id);
    return successResponse(res, 'User profile retrieved successfully', userProfile, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle user logout.
 * For stateless JWT, this confirms logout for the client to purge tokens.
 * Server-side token blacklisting or refresh rotation can be added in auth hardening.
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    return successResponse(res, 'Logged out successfully', null, 200);
  } catch (error) {
    return next(error);
  }
};

export default {
  login,
  getMe,
  logout,
};
