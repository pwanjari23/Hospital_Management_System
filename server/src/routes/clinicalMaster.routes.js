import { Router } from 'express';
import clinicalMasterController from '../controllers/clinicalMaster.controller.js';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import {
  validateMedicine,
  validateInvestigation,
  validateTreatment,
  validateEecpPackage,
  validatePaymentMode,
  validateMasterStatus,
} from '../validators/clinicalMaster.validator.js';

const router = Router();

// Protect all clinical masters with authentication & valid hospital tenant boundary
router.use(authenticate, requireHospitalTenant);

// ------------------------------------------
// 1. Medicines Master
// ------------------------------------------
router.get(
  '/medicines',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'),
  clinicalMasterController.getMedicines
);
router.post(
  '/medicines',
  requireRole('HOSPITAL_ADMIN'),
  validateMedicine,
  clinicalMasterController.createMedicine
);
router.patch(
  '/medicines/:id',
  requireRole('HOSPITAL_ADMIN'),
  validateMedicine,
  clinicalMasterController.updateMedicine
);
router.patch(
  '/medicines/:id/status',
  requireRole('HOSPITAL_ADMIN'),
  validateMasterStatus,
  clinicalMasterController.updateMedicineStatus
);

// ------------------------------------------
// 2. Investigations Master
// ------------------------------------------
router.get(
  '/investigations',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF'),
  clinicalMasterController.getInvestigations
);
router.post(
  '/investigations',
  requireRole('HOSPITAL_ADMIN'),
  validateInvestigation,
  clinicalMasterController.createInvestigation
);
router.patch(
  '/investigations/:id',
  requireRole('HOSPITAL_ADMIN'),
  validateInvestigation,
  clinicalMasterController.updateInvestigation
);
router.patch(
  '/investigations/:id/status',
  requireRole('HOSPITAL_ADMIN'),
  validateMasterStatus,
  clinicalMasterController.updateInvestigationStatus
);

// ------------------------------------------
// 3. Treatments Master
// ------------------------------------------
router.get(
  '/treatments',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  clinicalMasterController.getTreatments
);
router.post(
  '/treatments',
  requireRole('HOSPITAL_ADMIN'),
  validateTreatment,
  clinicalMasterController.createTreatment
);
router.patch(
  '/treatments/:id',
  requireRole('HOSPITAL_ADMIN'),
  validateTreatment,
  clinicalMasterController.updateTreatment
);
router.patch(
  '/treatments/:id/status',
  requireRole('HOSPITAL_ADMIN'),
  validateMasterStatus,
  clinicalMasterController.updateTreatmentStatus
);

// ------------------------------------------
// 4. EECP Packages Master
// ------------------------------------------
router.get(
  '/eecp-packages',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  clinicalMasterController.getEecpPackages
);
router.post(
  '/eecp-packages',
  requireRole('HOSPITAL_ADMIN'),
  validateEecpPackage,
  clinicalMasterController.createEecpPackage
);
router.patch(
  '/eecp-packages/:id',
  requireRole('HOSPITAL_ADMIN'),
  validateEecpPackage,
  clinicalMasterController.updateEecpPackage
);
router.patch(
  '/eecp-packages/:id/status',
  requireRole('HOSPITAL_ADMIN'),
  validateMasterStatus,
  clinicalMasterController.updateEecpPackageStatus
);

// ------------------------------------------
// 5. Payment Modes Master
// ------------------------------------------
router.get(
  '/payment-modes',
  requireRole('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  clinicalMasterController.getPaymentModes
);
router.post(
  '/payment-modes',
  requireRole('HOSPITAL_ADMIN'),
  validatePaymentMode,
  clinicalMasterController.createPaymentMode
);
router.patch(
  '/payment-modes/:id',
  requireRole('HOSPITAL_ADMIN'),
  validatePaymentMode,
  clinicalMasterController.updatePaymentMode
);
router.patch(
  '/payment-modes/:id/status',
  requireRole('HOSPITAL_ADMIN'),
  validateMasterStatus,
  clinicalMasterController.updatePaymentModeStatus
);

export default router;
