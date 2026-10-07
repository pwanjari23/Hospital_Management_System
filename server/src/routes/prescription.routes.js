import { Router } from 'express';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import prescriptionController from '../controllers/prescription.controller.js';
import {
  validateAddPrescriptionItem,
  validateUpdatePrescriptionItem,
} from '../validators/prescription.validator.js';

const router = Router();

// Protect with authentication & valid hospital tenant boundary
router.use(authenticate, requireHospitalTenant);

// 1. Get Prescription by ID
router.get(
  '/:id',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST']),
  prescriptionController.getPrescription
);

// 2. Update Prescription (Notes / Metadata)
router.put(
  '/:id',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  prescriptionController.updatePrescription
);

// 3. Finalize Prescription
router.patch(
  '/:id/finalize',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  prescriptionController.finalizePrescription
);

// 4. Cancel Prescription
router.patch(
  '/:id/cancel',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  prescriptionController.cancelPrescription
);

// 5. Add Item to Prescription
router.post(
  '/:prescriptionId/items',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateAddPrescriptionItem,
  prescriptionController.addItem
);

// 6. Update Prescription Item
router.put(
  '/:prescriptionId/items/:itemId',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateUpdatePrescriptionItem,
  prescriptionController.updateItem
);

// 7. Delete Prescription Item
router.delete(
  '/:prescriptionId/items/:itemId',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  prescriptionController.deleteItem
);

export default router;
