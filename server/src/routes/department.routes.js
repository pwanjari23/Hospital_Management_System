import { Router } from 'express';
import departmentController from '../controllers/department.controller.js';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateDepartmentStatus,
} from '../validators/department.validator.js';

const router = Router();

// Protect all department routes with authentication & valid hospital tenant boundary
router.use(authenticate, requireHospitalTenant);

/**
 * @route   GET /api/departments
 * @desc    Get paginated, searchable list of departments for the hospital tenant
 * @access  Private (All hospital staff)
 */
router.get(
  '/',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_STAFF'),
  departmentController.getDepartments
);

/**
 * @route   GET /api/departments/:id
 * @desc    Get a single department by ID
 * @access  Private (All hospital staff)
 */
router.get(
  '/:id',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_STAFF'),
  departmentController.getDepartmentById
);

/**
 * @route   POST /api/departments
 * @desc    Create a new department
 * @access  Private (Hospital Admin only)
 */
router.post(
  '/',
  requireRole('HOSPITAL_ADMIN'),
  validateCreateDepartment,
  departmentController.createDepartment
);

/**
 * @route   PUT /api/departments/:id
 * @desc    Update department details
 * @access  Private (Hospital Admin only)
 */
router.put(
  '/:id',
  requireRole('HOSPITAL_ADMIN'),
  validateUpdateDepartment,
  departmentController.updateDepartment
);

/**
 * @route   PATCH /api/departments/:id
 * @desc    Partial update department details
 * @access  Private (Hospital Admin only)
 */
router.patch(
  '/:id',
  requireRole('HOSPITAL_ADMIN'),
  validateUpdateDepartment,
  departmentController.updateDepartment
);

/**
 * @route   PATCH /api/departments/:id/status
 * @desc    Toggle department status (ACTIVE <-> INACTIVE)
 * @access  Private (Hospital Admin only)
 */
router.patch(
  '/:id/status',
  requireRole('HOSPITAL_ADMIN'),
  validateDepartmentStatus,
  departmentController.updateDepartmentStatus
);

export default router;
