import { Router } from 'express';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import eecpController from '../controllers/eecp.controller.js';
import {
  validateCreateCourse,
  validateUpdateCourse,
  validateCourseStatus,
  validateScheduleSession,
  validateSessionStatus,
  validatePreAssessment,
  validateAddReading,
} from '../validators/eecp.validator.js';

const router = Router();

// Enforce authentication & tenant boundary on all EECP endpoints
router.use(authenticate, requireHospitalTenant);

// --- Operational & Dashboard Metrics ---
router.get(
  '/dashboard-metrics',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  eecpController.getDashboardMetrics
);

router.get(
  '/sessions/today',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  eecpController.listTodaySessions
);

// --- Course Routes ---
router.get(
  '/courses',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  eecpController.listCourses
);

router.post(
  '/courses',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateCreateCourse,
  eecpController.createCourse
);

router.get(
  '/courses/:id',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  eecpController.getCourse
);

router.put(
  '/courses/:id',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateUpdateCourse,
  eecpController.updateCourse
);

router.patch(
  '/courses/:id/status',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateCourseStatus,
  eecpController.updateCourseStatus
);

router.get(
  '/courses/:id/progress',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  eecpController.getCourseProgress
);

router.get(
  '/courses/:courseId/sessions',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  eecpController.listCourseSessions
);

router.post(
  '/courses/:courseId/sessions',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  validateScheduleSession,
  eecpController.scheduleSession
);

// --- Session Routes ---
router.get(
  '/sessions/:id',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  eecpController.getSession
);

router.post(
  '/sessions/:id/pre-assessment',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']),
  validatePreAssessment,
  eecpController.recordPreAssessment
);

router.patch(
  '/sessions/:id/status',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']),
  validateSessionStatus,
  eecpController.updateSessionStatus
);

router.delete(
  '/sessions/:id',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  eecpController.deleteSession
);

// --- Session Telemetric Readings ---
router.get(
  '/sessions/:id/readings',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  eecpController.listSessionReadings
);

router.post(
  '/sessions/:id/readings',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']),
  validateAddReading,
  eecpController.addSessionReading
);

export default router;
