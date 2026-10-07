import { Router } from 'express';
import {
  authenticate,
  requireRole,
  requireHospitalTenant,
} from '../middleware/auth.middleware.js';
import {
  getDashboardMetrics,
  getInventory,
  stockIn,
  getBatchById,
  getBatchTransactions,
  updateBatchStatus,
  getPrescriptionQueue,
  getPrescriptionForDispensing,
  dispensePrescription,
  getDispensingById,
  getPatientMedicationHistory,
} from '../controllers/pharmacy.controller.js';
import {
  validateStockIn,
  validateDispense,
  validateBatchStatus,
} from '../validators/pharmacy.validator.js';

const router = Router();

// Base middleware for all pharmacy endpoints
router.use(authenticate);
router.use(requireHospitalTenant);

// Roles definitions
const PHARMACY_OPERATOR_ROLES = ['HOSPITAL_ADMIN', 'PHARMACIST'];
const PHARMACY_VIEW_ROLES = ['HOSPITAL_ADMIN', 'PHARMACIST', 'DOCTOR', 'NURSE'];

// 1. Dashboard Metrics
router.get(
  '/dashboard/metrics',
  requireRole(PHARMACY_VIEW_ROLES),
  getDashboardMetrics
);

// 2. Inventory & Batches
router.get(
  '/inventory',
  requireRole(PHARMACY_VIEW_ROLES),
  getInventory
);

router.post(
  '/inventory/stock-in',
  requireRole(PHARMACY_OPERATOR_ROLES),
  validateStockIn,
  stockIn
);

router.get(
  '/inventory/:id',
  requireRole(PHARMACY_VIEW_ROLES),
  getBatchById
);

router.get(
  '/inventory/:id/transactions',
  requireRole(PHARMACY_VIEW_ROLES),
  getBatchTransactions
);

router.patch(
  '/inventory/:id/status',
  requireRole(PHARMACY_OPERATOR_ROLES),
  validateBatchStatus,
  updateBatchStatus
);

// 3. Prescription Queue & Dispensing
router.get(
  '/prescriptions',
  requireRole(PHARMACY_VIEW_ROLES),
  getPrescriptionQueue
);

router.get(
  '/prescriptions/:id',
  requireRole(PHARMACY_VIEW_ROLES),
  getPrescriptionForDispensing
);

router.post(
  '/prescriptions/:id/dispense',
  requireRole(PHARMACY_OPERATOR_ROLES),
  validateDispense,
  dispensePrescription
);

router.get(
  '/dispensings/:id',
  requireRole(PHARMACY_VIEW_ROLES),
  getDispensingById
);

// 4. Patient Medication History
router.get(
  '/patients/:patientId/medication-history',
  requireRole(PHARMACY_VIEW_ROLES),
  getPatientMedicationHistory
);

export default router;
