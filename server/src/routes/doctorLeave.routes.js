import { Router } from 'express';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import doctorLeaveController from '../controllers/doctorLeave.controller.js';
import {
  validateCreateLeave,
  validateUpdateLeave,
} from '../validators/doctorLeave.validator.js';

const router = Router();

// Enforce authentication & tenant boundary on all doctor-leaves endpoints
router.use(authenticate, requireHospitalTenant);

// Read: HOSPITAL_ADMIN, RECEPTIONIST, DOCTOR, NURSE
router.get(
  '/',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  doctorLeaveController.listLeaves
);

router.get(
  '/:id',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  doctorLeaveController.getLeave
);

// Manage: HOSPITAL_ADMIN, DOCTOR (for own leave)
router.post(
  '/',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateCreateLeave,
  doctorLeaveController.createLeave
);

router.put(
  '/:id',
  requireRole(['HOSPITAL_ADMIN']),
  validateUpdateLeave,
  doctorLeaveController.updateLeave
);

router.patch(
  '/:id/status',
  requireRole(['HOSPITAL_ADMIN']),
  doctorLeaveController.toggleLeaveStatus
);

router.delete(
  '/:id',
  requireRole(['HOSPITAL_ADMIN']),
  doctorLeaveController.deleteLeave
);

export default router;
