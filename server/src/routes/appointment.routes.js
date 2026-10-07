import { Router } from 'express';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import appointmentController from '../controllers/appointment.controller.js';
import {
  validateCreateAppointment,
  validateUpdateAppointment,
  validateUpdateStatus,
  validateReschedule,
  validateCancel,
} from '../validators/appointment.validator.js';

const router = Router();

// Enforce authentication & tenant boundary on all appointment endpoints
router.use(authenticate, requireHospitalTenant);

// 1. Slots & Calendar generation
router.get(
  '/slots',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  appointmentController.getSlots
);

// 2. Metrics / Summary
router.get(
  '/stats',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  appointmentController.getStats
);

// 3. List Appointments
router.get(
  '/',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  appointmentController.listAppointments
);

// 4. Get Appointment by ID
router.get(
  '/:id',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  appointmentController.getAppointment
);

// 5. Book Appointment
router.post(
  '/',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST']),
  validateCreateAppointment,
  appointmentController.bookAppointment
);

// 6. Update generic details
router.put(
  '/:id',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST']),
  validateUpdateAppointment,
  appointmentController.updateAppointment
);

// 7. Update Status (CHECKED_IN, IN_PROGRESS, COMPLETED, NO_SHOW)
router.patch(
  '/:id/status',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']),
  validateUpdateStatus,
  appointmentController.updateStatus
);

// 8. Reschedule
router.patch(
  '/:id/reschedule',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST']),
  validateReschedule,
  appointmentController.reschedule
);

// 9. Cancel
router.patch(
  '/:id/cancel',
  requireRole(['HOSPITAL_ADMIN', 'RECEPTIONIST']),
  validateCancel,
  appointmentController.cancel
);

export default router;
