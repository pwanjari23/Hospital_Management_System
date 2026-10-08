import { Router } from 'express';
import {
  authenticate,
  requireRole,
  requireHospitalTenant,
} from '../middleware/auth.middleware.js';
import {
  getDashboardMetrics,
  getLaboratoryQueue,
  getOrderDetails,
  createOrCollectSample,
  updateSampleStatus,
  saveResult,
  verifyResult,
  finalizeResult,
  getResultById,
  getEncounterResults,
  getPatientInvestigationHistory,
} from '../controllers/laboratory.controller.js';
import {
  validateCreateSample,
  validateUpdateSample,
  validateSaveResult,
  validateResultAction,
} from '../validators/laboratory.validator.js';

const router = Router();

// Base middleware for all laboratory routes
router.use(authenticate);
router.use(requireHospitalTenant);

// RBAC Role Definitions
const LAB_OPERATOR_ROLES = ['HOSPITAL_ADMIN', 'LAB_STAFF'];
const SAMPLE_COLLECT_ROLES = ['HOSPITAL_ADMIN', 'LAB_STAFF', 'NURSE'];
const LAB_VIEW_ROLES = ['HOSPITAL_ADMIN', 'LAB_STAFF', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];

// 1. Dashboard Metrics
router.get(
  '/dashboard/metrics',
  requireRole(LAB_VIEW_ROLES),
  getDashboardMetrics
);

// 2. Laboratory Queue
router.get(
  '/orders',
  requireRole(LAB_VIEW_ROLES),
  getLaboratoryQueue
);

// 3. Order Details
router.get(
  '/orders/:orderId',
  requireRole(LAB_VIEW_ROLES),
  getOrderDetails
);

// 4. Sample Collection & Management
router.post(
  '/orders/:orderId/sample',
  requireRole(SAMPLE_COLLECT_ROLES),
  validateCreateSample,
  createOrCollectSample
);

router.patch(
  '/samples/:sampleId',
  requireRole(LAB_OPERATOR_ROLES),
  validateUpdateSample,
  updateSampleStatus
);

// 5. Result Entry, Verification & Finalization
router.post(
  '/orders/:orderId/result',
  requireRole(LAB_OPERATOR_ROLES),
  validateSaveResult,
  saveResult
);

router.post(
  '/results/:resultId/verify',
  requireRole(LAB_OPERATOR_ROLES),
  validateResultAction,
  verifyResult
);

router.post(
  '/results/:resultId/finalize',
  requireRole(LAB_OPERATOR_ROLES),
  validateResultAction,
  finalizeResult
);

router.get(
  '/results/:resultId',
  requireRole(LAB_VIEW_ROLES),
  getResultById
);

// 6. Clinical & Encounter Integration
router.get(
  '/encounters/:encounterId/results',
  requireRole(LAB_VIEW_ROLES),
  getEncounterResults
);

// 7. Patient Investigation History
router.get(
  '/patients/:patientId/results',
  requireRole(LAB_VIEW_ROLES),
  getPatientInvestigationHistory
);

export default router;
