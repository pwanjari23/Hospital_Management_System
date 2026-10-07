import { Router } from 'express';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import doctorScheduleController from '../controllers/doctorSchedule.controller.js';
import {
  validateCreateSchedule,
  validateUpdateSchedule,
} from '../validators/doctorSchedule.validator.js';

const router = Router();

// Enforce authentication & tenant boundary on all doctor-schedules endpoints
router.use(authenticate, requireHospitalTenant);

// Read: HOSPITAL_ADMIN, RECEPTIONIST, DOCTOR, NURSE
router.get(
  '/',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  doctorScheduleController.listSchedules
);

router.get(
  '/doctor/:doctorId',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  doctorScheduleController.getSchedulesByDoctor
);

router.get(
  '/:id',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  doctorScheduleController.getSchedule
);

// Manage: HOSPITAL_ADMIN
router.post(
  '/',
  requireRole(['HOSPITAL_ADMIN']),
  validateCreateSchedule,
  doctorScheduleController.createSchedule
);

router.put(
  '/:id',
  requireRole(['HOSPITAL_ADMIN']),
  validateUpdateSchedule,
  doctorScheduleController.updateSchedule
);

router.patch(
  '/:id/status',
  requireRole(['HOSPITAL_ADMIN']),
  doctorScheduleController.toggleScheduleStatus
);

router.delete(
  '/:id',
  requireRole(['HOSPITAL_ADMIN']),
  doctorScheduleController.deleteSchedule
);

export default router;
