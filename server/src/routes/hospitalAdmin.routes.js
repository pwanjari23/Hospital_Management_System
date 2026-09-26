import { Router } from 'express';
import hospitalAdminController from '../controllers/hospitalAdmin.controller.js';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';

const router = Router();

// Protect all hospital-admin routes: user must be authenticated with non-null hospital context
router.use(
  authenticate,
  requireHospitalTenant,
  requireRole('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE')
);

/**
 * @route   GET /api/hospital-admin/dashboard
 * @desc    Get aggregate patient and staff metrics for authenticated hospital
 * @access  Private (Hospital Staff)
 */
router.get('/dashboard', hospitalAdminController.getDashboard);

export default router;
