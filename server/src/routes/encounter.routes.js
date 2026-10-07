import { Router } from 'express';
import {
  authenticate,
  requireHospitalTenant,
  requireRole,
} from '../middleware/auth.middleware.js';
import encounterController from '../controllers/encounter.controller.js';
import vitalController from '../controllers/vital.controller.js';
import encounterDiagnosisController from '../controllers/encounterDiagnosis.controller.js';
import prescriptionController from '../controllers/prescription.controller.js';
import investigationOrderController from '../controllers/investigationOrder.controller.js';
import {
  validateCreateEncounter,
  validateUpdateConsultation,
} from '../validators/encounter.validator.js';
import { validateCreateVital } from '../validators/vital.validator.js';
import {
  validateCreateDiagnosis,
  validateUpdateDiagnosis,
} from '../validators/encounterDiagnosis.validator.js';
import { validateCreatePrescription } from '../validators/prescription.validator.js';
import { validateCreateInvestigationOrder } from '../validators/investigationOrder.validator.js';
import eecpController from '../controllers/eecp.controller.js';
import { validateUpsertAssessment } from '../validators/eecp.validator.js';

const router = Router();

// Enforce authentication & tenant boundary on all clinical encounter endpoints
router.use(authenticate, requireHospitalTenant);

// 1. Patient Clinical Timeline
router.get(
  '/patient/:patientId/timeline',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']),
  encounterController.getPatientTimeline
);

// 2. List Encounters
router.get(
  '/',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  encounterController.listEncounters
);

// 3. Get Encounter Details by ID
router.get(
  '/:id',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']),
  encounterController.getEncounter
);

// 4. Create Encounter (from checked-in appointment or desk)
router.post(
  '/',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  validateCreateEncounter,
  encounterController.createEncounter
);

// 5. Update Doctor Consultation Notes (Save Draft)
router.put(
  '/:id/consultation',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateUpdateConsultation,
  encounterController.updateConsultation
);

// 6. Complete Consultation
router.patch(
  '/:id/complete',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateUpdateConsultation,
  encounterController.completeEncounter
);

// 7. Sub-resources: Vitals for Encounter
router.get(
  '/:encounterId/vitals',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']),
  vitalController.listVitals
);

router.post(
  '/:encounterId/vitals',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']),
  validateCreateVital,
  vitalController.createVital
);

// 8. Sub-resources: Diagnoses for Encounter
router.get(
  '/:encounterId/diagnoses',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']),
  encounterDiagnosisController.listDiagnoses
);

router.post(
  '/:encounterId/diagnoses',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateCreateDiagnosis,
  encounterDiagnosisController.addDiagnosis
);

router.put(
  '/:encounterId/diagnoses/:diagnosisId',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateUpdateDiagnosis,
  encounterDiagnosisController.updateDiagnosis
);

router.delete(
  '/:encounterId/diagnoses/:diagnosisId',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  encounterDiagnosisController.deleteDiagnosis
);

// 9. Sub-resources: Prescriptions for Encounter
router.get(
  '/:encounterId/prescriptions',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST']),
  prescriptionController.listEncounterPrescriptions
);

router.post(
  '/:encounterId/prescriptions',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateCreatePrescription,
  prescriptionController.createPrescription
);

// 10. Sub-resources: Investigation Orders for Encounter
router.get(
  '/:encounterId/investigation-orders',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF']),
  investigationOrderController.listEncounterInvestigationOrders
);

router.post(
  '/:encounterId/investigation-orders',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateCreateInvestigationOrder,
  investigationOrderController.createInvestigationOrder
);

// 11. Sub-resources: EECP Assessment for Encounter
router.get(
  '/:encounterId/eecp-assessment',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']),
  eecpController.getEncounterAssessment
);

router.post(
  '/:encounterId/eecp-assessment',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateUpsertAssessment,
  eecpController.upsertAssessment
);

router.put(
  '/:encounterId/eecp-assessment',
  requireRole(['HOSPITAL_ADMIN', 'DOCTOR']),
  validateUpsertAssessment,
  eecpController.upsertAssessment
);

export default router;

