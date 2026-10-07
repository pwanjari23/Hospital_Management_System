import { Router } from 'express';
import hospitalAdminController from '../controllers/hospitalAdmin.controller.js';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';

const router = Router();

// Protect all hospital-admin routes: user must be authenticated with non-null hospital context
router.use(authenticate, requireHospitalTenant);

/**
 * @route   GET /api/hospital-admin/dashboard
 * @desc    Get aggregate patient and staff metrics for authenticated hospital
 * @access  Private (Hospital Staff)
 */
router.get(
  '/dashboard',
  requireRole('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  hospitalAdminController.getDashboard
);

/**
 * @route   GET /api/hospital-admin/settings
 * @desc    Get hospital profile and settings
 * @access  Private (Hospital Admin, Receptionist)
 */
router.get(
  '/settings',
  requireRole('HOSPITAL_ADMIN', 'RECEPTIONIST'),
  hospitalAdminController.getSettings
);

/**
 * @route   PATCH /api/hospital-admin/settings/profile
 * @desc    Update hospital profile information
 * @access  Private (Hospital Admin only)
 */
router.patch(
  '/settings/profile',
  requireRole('HOSPITAL_ADMIN'),
  hospitalAdminController.updateProfile
);

/**
 * @route   PUT /api/hospital-admin/settings/patient-config
 * @desc    Update patient settings (UHID prefix, etc.)
 * @access  Private (Hospital Admin only)
 */
router.put(
  '/settings/patient-config',
  requireRole('HOSPITAL_ADMIN'),
  hospitalAdminController.updatePatientConfig
);

/**
 * @route   PUT /api/hospital-admin/settings/billing-config
 * @desc    Update billing configurations (tax, prefixes, payment terms)
 * @access  Private (Hospital Admin only)
 */
router.put(
  '/settings/billing-config',
  requireRole('HOSPITAL_ADMIN'),
  hospitalAdminController.updateBillingConfig
);

/**
 * @route   PUT /api/hospital-admin/settings/notification-config
 * @desc    Update notification configurations
 * @access  Private (Hospital Admin only)
 */
router.put(
  '/settings/notification-config',
  requireRole('HOSPITAL_ADMIN'),
  hospitalAdminController.updateNotificationConfig
);

export default router;
