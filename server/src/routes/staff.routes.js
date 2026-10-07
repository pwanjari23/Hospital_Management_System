import { Router } from 'express';
import staffController from '../controllers/staff.controller.js';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import {
  validateCreateStaff,
  validateUpdateStaff,
  validateStaffStatus,
} from '../validators/staff.validator.js';

const router = Router();

// Protect all staff routes with authentication & valid hospital tenant boundary
router.use(authenticate, requireHospitalTenant);

/**
 * @route   GET /api/staff
 * @desc    Get paginated, searchable, filterable staff and doctors list
 * @access  Private (Hospital Admin, Doctor, Receptionist)
 */
router.get(
  '/',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'),
  staffController.getStaff
);

/**
 * @route   GET /api/staff/:id
 * @desc    Get full staff/doctor profile by ID
 * @access  Private (Hospital Admin, Doctor, Receptionist)
 */
router.get(
  '/:id',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'),
  staffController.getStaffById
);

/**
 * @route   POST /api/staff
 * @desc    Provision new doctor or staff member for hospital tenant
 * @access  Private (Hospital Admin only)
 */
router.post(
  '/',
  requireRole('HOSPITAL_ADMIN'),
  validateCreateStaff,
  staffController.createStaff
);

/**
 * @route   PATCH /api/staff/:id
 * @desc    Update staff/doctor details and role assignment
 * @access  Private (Hospital Admin only)
 */
router.patch(
  '/:id',
  requireRole('HOSPITAL_ADMIN'),
  validateUpdateStaff,
  staffController.updateStaff
);

/**
 * @route   PATCH /api/staff/:id/status
 * @desc    Toggle staff active/inactive status
 * @access  Private (Hospital Admin only)
 */
router.patch(
  '/:id/status',
  requireRole('HOSPITAL_ADMIN'),
  validateStaffStatus,
  staffController.updateStaffStatus
);

export default router;
