import { Router } from 'express';
import patientController from '../controllers/patient.controller.js';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import {
  validateCreatePatient,
  validateUpdatePatient,
  validatePatientStatus,
} from '../validators/patient.validator.js';

const router = Router();

// Protect all patient endpoints: valid JWT and non-null hospital context required
router.use(authenticate, requireHospitalTenant);

/**
 * @route   GET /api/patients
 * @desc    List patients for the hospital tenant with search, filtering, and pagination
 * @access  Private (Hospital Admin, Receptionist, Doctor, Nurse, Pharmacist, Lab Staff)
 */
router.get(
  '/',
  requireRole('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_STAFF'),
  patientController.getPatients
);

/**
 * @route   GET /api/patients/:id
 * @desc    Retrieve patient details by ID under strict tenant boundary
 * @access  Private (Hospital Admin, Receptionist, Doctor, Nurse, Pharmacist, Lab Staff)
 */
router.get(
  '/:id',
  requireRole('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_STAFF'),
  patientController.getPatientById
);

/**
 * @route   POST /api/patients
 * @desc    Register a new patient with auto-generated UHID
 * @access  Private (Hospital Admin, Receptionist, Doctor, Nurse)
 */
router.post(
  '/',
  requireRole('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  validateCreatePatient,
  patientController.createPatient
);

/**
 * @route   PATCH /api/patients/:id
 * @desc    Update patient details
 * @access  Private (Hospital Admin, Doctor, Nurse - all fields; Receptionist - demographics & contact only)
 */
router.patch(
  '/:id',
  requireRole('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  validateUpdatePatient,
  patientController.updatePatient
);

/**
 * @route   PATCH /api/patients/:id/status
 * @desc    Toggle patient active/inactive status
 * @access  Private (Hospital Admin only)
 */
router.patch(
  '/:id/status',
  requireRole('HOSPITAL_ADMIN'),
  validatePatientStatus,
  patientController.updatePatientStatus
);

export default router;
