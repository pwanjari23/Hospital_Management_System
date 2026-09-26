import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { validateLogin } from '../validators/auth.validator.js';
import { loginRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate Super Admin & obtain access token
 * @access  Public (Rate limited)
 */
router.post('/login', loginRateLimiter, validateLogin, authController.login);

/**
 * @route   POST /api/auth/hospital-login
 * @desc    Authenticate Hospital Admin & Staff tenant user & obtain access token
 * @access  Public (Rate limited)
 */
router.post('/hospital-login', loginRateLimiter, validateLogin, authController.hospitalLogin);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Protected (Requires valid JWT)
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user & acknowledge session termination
 * @access  Protected (Requires valid JWT)
 */
router.post('/logout', authenticate, authController.logout);

export default router;
