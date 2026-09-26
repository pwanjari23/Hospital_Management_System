import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all super-admin routes
router.use(authenticate, requireSuperAdmin);

/**
 * @route   GET /api/super-admin/dashboard
 * @desc    Get aggregate metrics and recent hospital activity
 * @access  Private (Super Admin)
 */
router.get('/dashboard', dashboardController.getDashboard);

export default router;
