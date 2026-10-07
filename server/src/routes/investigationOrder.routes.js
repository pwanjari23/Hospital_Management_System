import { Router } from 'express';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import investigationOrderController from '../controllers/investigationOrder.controller.js';
import { validateUpdateInvestigationOrder } from '../validators/investigationOrder.validator.js';

const router = Router();

// Protect with authentication & valid hospital tenant boundary
router.use(authenticate, requireHospitalTenant);

// 1. Get Investigation Order by ID
router.get(
  '/:id',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF']),
  investigationOrderController.getInvestigationOrder
);

// 2. Update Investigation Order (while still ORDERED)
router.put(
  '/:id',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateUpdateInvestigationOrder,
  investigationOrderController.updateInvestigationOrder
);

// 3. Finalize Investigation Order
router.patch(
  '/:id/finalize',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  investigationOrderController.finalizeInvestigationOrder
);

// 4. Cancel Investigation Order
router.patch(
  '/:id/cancel',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  investigationOrderController.cancelInvestigationOrder
);

// 5. Delete Investigation Order
router.delete(
  '/:id',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  investigationOrderController.deleteInvestigationOrder
);

export default router;
