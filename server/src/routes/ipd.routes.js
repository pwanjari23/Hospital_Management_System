import { Router } from 'express';
import {
  authenticate,
  requireRole,
  requireHospitalTenant,
} from '../middleware/auth.middleware.js';
import {
  getDashboardMetrics,
  getBedBoard,
  getWards,
  getWardById,
  createWard,
  updateWard,
  getBeds,
  getBedById,
  createBed,
  updateBed,
  updateBedStatus,
  getAdmissions,
  getAdmissionById,
  createAdmission,
  cancelAdmission,
  transferBed,
  getAdmissionTransfers,
  getPatientAdmissions,
  createInpatientVital,
  getAdmissionVitals,
  createProgressNote,
  getProgressNotes,
  getProgressNoteById,
  updateProgressNote,
  finalizeProgressNote,
  createNursingNote,
  getNursingNotes,
  getNursingNoteById,
  updateNursingNote,
  finalizeNursingNote,
  getAdmissionPrescriptions,
  getAdmissionInvestigations,
  getAdmissionTimeline,
  getDischargeSummary,
  createOrUpdateDischargeSummary,
  finalizeDischarge,
} from '../controllers/ipd.controller.js';
import {
  validateCreateWard,
  validateUpdateWard,
  validateCreateBed,
  validateUpdateBed,
  validateUpdateBedStatus,
  validateCreateAdmission,
  validateTransferBed,
  validateCancelAdmission,
  validateInpatientVital,
  validateProgressNote,
  validateNursingNote,
  validateDischargeSummary,
  validateFinalizeDischarge,
} from '../validators/ipd.validator.js';

const router = Router();

// Base middleware: All IPD routes require valid authentication and hospital tenant context
router.use(authenticate);
router.use(requireHospitalTenant);

// Role groupings
const ALL_IPD_VIEWERS = [
  'HOSPITAL_ADMIN',
  'RECEPTIONIST',
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
  'LAB_STAFF',
];

const CLINICAL_STAFF = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'];
const ADMISSION_CREATORS = ['HOSPITAL_ADMIN', 'RECEPTIONIST'];
const TRANSFER_OPERATORS = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'];
const CONFIG_ADMINS = ['HOSPITAL_ADMIN'];
const DOCTORS_ONLY = ['DOCTOR', 'HOSPITAL_ADMIN'];
const NURSES_ONLY = ['NURSE', 'HOSPITAL_ADMIN'];
const VITALS_RECORDERS = ['NURSE', 'DOCTOR', 'HOSPITAL_ADMIN'];
const DISCHARGE_AUTHORIZERS = ['DOCTOR', 'HOSPITAL_ADMIN'];

// ==========================================
// 1. Dashboard & Bed Board
// ==========================================
router.get('/dashboard', requireRole(CLINICAL_STAFF), getDashboardMetrics);
router.get('/bed-board', requireRole(ALL_IPD_VIEWERS), getBedBoard);

// ==========================================
// 2. Wards
// ==========================================
router.get('/wards', requireRole(ALL_IPD_VIEWERS), getWards);
router.get('/wards/:id', requireRole(ALL_IPD_VIEWERS), getWardById);
router.post('/wards', requireRole(CONFIG_ADMINS), validateCreateWard, createWard);
router.patch('/wards/:id', requireRole(CONFIG_ADMINS), validateUpdateWard, updateWard);

// ==========================================
// 3. Beds
// ==========================================
router.get('/beds', requireRole(ALL_IPD_VIEWERS), getBeds);
router.get('/beds/:id', requireRole(ALL_IPD_VIEWERS), getBedById);
router.post('/beds', requireRole(CONFIG_ADMINS), validateCreateBed, createBed);
router.patch('/beds/:id', requireRole(CONFIG_ADMINS), validateUpdateBed, updateBed);
router.patch('/beds/:id/status', requireRole(CONFIG_ADMINS), validateUpdateBedStatus, updateBedStatus);

// ==========================================
// 4. IPD Admissions
// ==========================================
router.get('/admissions', requireRole(ALL_IPD_VIEWERS), getAdmissions);
router.get('/admissions/:id', requireRole(ALL_IPD_VIEWERS), getAdmissionById);
router.post('/admissions', requireRole(ADMISSION_CREATORS), validateCreateAdmission, createAdmission);
router.post('/admissions/:id/cancel', requireRole(ADMISSION_CREATORS), validateCancelAdmission, cancelAdmission);

// ==========================================
// 5. Bed Transfers
// ==========================================
router.post('/admissions/:id/transfer', requireRole(TRANSFER_OPERATORS), validateTransferBed, transferBed);
router.get('/admissions/:id/transfers', requireRole(ALL_IPD_VIEWERS), getAdmissionTransfers);

// ==========================================
// 6. Patient Admissions History
// ==========================================
router.get('/patients/:patientId/admissions', requireRole(ALL_IPD_VIEWERS), getPatientAdmissions);

// ==========================================
// 7. Phase 9B: Inpatient Vitals
// ==========================================
router.get('/admissions/:id/vitals', requireRole(ALL_IPD_VIEWERS), getAdmissionVitals);
router.post('/admissions/:id/vitals', requireRole(VITALS_RECORDERS), validateInpatientVital, createInpatientVital);

// ==========================================
// 8. Phase 9B: Doctor Progress Notes (SOAP)
// ==========================================
router.get('/admissions/:id/progress', requireRole(ALL_IPD_VIEWERS), getProgressNotes);
router.post('/admissions/:id/progress', requireRole(DOCTORS_ONLY), validateProgressNote, createProgressNote);
router.get('/progress/:noteId', requireRole(ALL_IPD_VIEWERS), getProgressNoteById);
router.put('/progress/:noteId', requireRole(DOCTORS_ONLY), validateProgressNote, updateProgressNote);
router.patch('/progress/:noteId/finalize', requireRole(DOCTORS_ONLY), finalizeProgressNote);

// ==========================================
// 9. Phase 9B: Nursing Daily Notes
// ==========================================
router.get('/admissions/:id/nursing-notes', requireRole(ALL_IPD_VIEWERS), getNursingNotes);
router.post('/admissions/:id/nursing-notes', requireRole(NURSES_ONLY), validateNursingNote, createNursingNote);
router.get('/nursing-notes/:noteId', requireRole(ALL_IPD_VIEWERS), getNursingNoteById);
router.put('/nursing-notes/:noteId', requireRole(NURSES_ONLY), validateNursingNote, updateNursingNote);
router.patch('/nursing-notes/:noteId/finalize', requireRole(NURSES_ONLY), finalizeNursingNote);

// ==========================================
// 10. Phase 9B: Clinical Context (Prescriptions & Labs)
// ==========================================
router.get('/admissions/:id/prescriptions', requireRole(ALL_IPD_VIEWERS), getAdmissionPrescriptions);
router.get('/admissions/:id/medications', requireRole(ALL_IPD_VIEWERS), getAdmissionPrescriptions);
router.get('/admissions/:id/investigations', requireRole(ALL_IPD_VIEWERS), getAdmissionInvestigations);

// ==========================================
// 11. Phase 9B: Chronological Clinical Timeline
// ==========================================
router.get('/admissions/:id/timeline', requireRole(ALL_IPD_VIEWERS), getAdmissionTimeline);

// ==========================================
// 12. Phase 9B: Discharge Summary & Execution
// ==========================================
router.get('/admissions/:id/discharge-summary', requireRole(ALL_IPD_VIEWERS), getDischargeSummary);
router.get('/admissions/:id/discharge', requireRole(ALL_IPD_VIEWERS), getDischargeSummary);
router.post('/admissions/:id/discharge-summary', requireRole(DISCHARGE_AUTHORIZERS), validateDischargeSummary, createOrUpdateDischargeSummary);
router.post('/admissions/:id/discharge', requireRole(DISCHARGE_AUTHORIZERS), validateFinalizeDischarge, finalizeDischarge);

export default router;
