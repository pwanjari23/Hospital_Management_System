import { Router } from 'express';
import hospitalController from '../controllers/hospital.controller.js';
import {
  validateCreateHospital,
  validateUpdateHospital,
  validateHospitalStatus,
  validateHospitalQuery,
  validateCreateHospitalUser,
  validateUpdateHospitalSettings,
} from '../validators/hospital.validator.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all hospital routes: must be authenticated Platform Super Admin
router.use(authenticate, requireSuperAdmin);

/**
 * @route   GET /api/hospitals
 * @desc    Get paginated, searchable, filterable list of hospitals
 * @access  Private (Super Admin)
 */
router.get('/', validateHospitalQuery, hospitalController.getHospitals);

/**
 * @route   GET /api/hospitals/:id
 * @desc    Get full hospital details including settings
 * @access  Private (Super Admin)
 */
router.get('/:id', hospitalController.getHospitalById);

/**
 * @route   POST /api/hospitals
 * @desc    Create a new hospital, default settings, and optional initial admin
 * @access  Private (Super Admin)
 */
router.post('/', validateCreateHospital, hospitalController.createHospital);

/**
 * @route   PATCH /api/hospitals/:id
 * @desc    Update hospital details (whitelisted mutable fields)
 * @access  Private (Super Admin)
 */
router.patch('/:id', validateUpdateHospital, hospitalController.updateHospital);

/**
 * @route   PATCH /api/hospitals/:id/status
 * @desc    Transition hospital status (ACTIVE <-> INACTIVE)
 * @access  Private (Super Admin)
 */
router.patch('/:id/status', validateHospitalStatus, hospitalController.updateHospitalStatus);

/**
 * @route   GET /api/hospitals/:id/users
 * @desc    Get all staff/admin users belonging to a specific hospital
 * @access  Private (Super Admin)
 */
router.get('/:id/users', hospitalController.getHospitalUsers);

/**
 * @route   POST /api/hospitals/:id/users
 * @desc    Create an additional staff/admin user for a specific hospital
 * @access  Private (Super Admin)
 */
router.post('/:id/users', validateCreateHospitalUser, hospitalController.createHospitalUser);

/**
 * @route   PUT /api/hospitals/:id/settings
 * @desc    Update tenant module configuration and settings
 * @access  Private (Super Admin)
 */
router.put('/:id/settings', validateUpdateHospitalSettings, hospitalController.updateHospitalSettings);

export default router;
