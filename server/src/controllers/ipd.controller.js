import ipdService from '../services/ipd.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// ==========================================
// Dashboard & Bed Board
// ==========================================

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await ipdService.getIpdDashboardMetrics(req.user.hospitalId);
    return successResponse(res, 'IPD dashboard metrics retrieved successfully', metrics);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getBedBoard = async (req, res, next) => {
  try {
    const board = await ipdService.getBedBoard(req.user.hospitalId, req.query);
    return successResponse(res, 'Bed board retrieved successfully', board);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Wards
// ==========================================

export const getWards = async (req, res, next) => {
  try {
    const wards = await ipdService.getWards(req.user.hospitalId, req.query);
    return successResponse(res, 'Wards retrieved successfully', wards);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getWardById = async (req, res, next) => {
  try {
    const ward = await ipdService.getWardById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Ward retrieved successfully', ward);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const createWard = async (req, res, next) => {
  try {
    const ward = await ipdService.createWard(req.user.hospitalId, req.body, req.user);
    return successResponse(res, 'Ward created successfully', ward, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateWard = async (req, res, next) => {
  try {
    const ward = await ipdService.updateWard(req.user.hospitalId, req.params.id, req.body, req.user);
    return successResponse(res, 'Ward updated successfully', ward);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Beds
// ==========================================

export const getBeds = async (req, res, next) => {
  try {
    const beds = await ipdService.getBeds(req.user.hospitalId, req.query);
    return successResponse(res, 'Beds retrieved successfully', beds);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getBedById = async (req, res, next) => {
  try {
    const bed = await ipdService.getBedById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Bed retrieved successfully', bed);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const createBed = async (req, res, next) => {
  try {
    const bed = await ipdService.createBed(req.user.hospitalId, req.body, req.user);
    return successResponse(res, 'Bed created successfully', bed, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateBed = async (req, res, next) => {
  try {
    const bed = await ipdService.updateBed(req.user.hospitalId, req.params.id, req.body, req.user);
    return successResponse(res, 'Bed updated successfully', bed);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateBedStatus = async (req, res, next) => {
  try {
    const bed = await ipdService.updateBedStatus(req.user.hospitalId, req.params.id, req.body, req.user);
    return successResponse(res, 'Bed status updated successfully', bed);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Admissions
// ==========================================

export const getAdmissions = async (req, res, next) => {
  try {
    const result = await ipdService.getAdmissions(req.user.hospitalId, req.query);
    return successResponse(res, 'IPD Admissions retrieved successfully', result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getAdmissionById = async (req, res, next) => {
  try {
    const admission = await ipdService.getAdmissionById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'IPD Admission retrieved successfully', admission);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const createAdmission = async (req, res, next) => {
  try {
    const admission = await ipdService.createAdmission(req.user.hospitalId, req.body, req.user);
    return successResponse(res, 'Patient admitted successfully', admission, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const cancelAdmission = async (req, res, next) => {
  try {
    const admission = await ipdService.cancelAdmission(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user
    );
    return successResponse(res, 'Admission cancelled successfully', admission);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Bed Transfers
// ==========================================

export const transferBed = async (req, res, next) => {
  try {
    const admission = await ipdService.transferBed(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user
    );
    return successResponse(res, 'Bed transferred successfully', admission);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getAdmissionTransfers = async (req, res, next) => {
  try {
    const transfers = await ipdService.getAdmissionTransfers(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Bed transfers retrieved successfully', transfers);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Patient Admissions History
// ==========================================

export const getPatientAdmissions = async (req, res, next) => {
  try {
    const admissions = await ipdService.getPatientAdmissions(req.user.hospitalId, req.params.patientId);
    return successResponse(res, 'Patient admissions retrieved successfully', admissions);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Phase 9B: Inpatient Vitals
// ==========================================

export const createInpatientVital = async (req, res, next) => {
  try {
    const vital = await ipdService.createInpatientVital(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user
    );
    return successResponse(res, 'Inpatient vital recorded successfully', vital, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getAdmissionVitals = async (req, res, next) => {
  try {
    const vitals = await ipdService.getAdmissionVitals(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Admission vitals retrieved successfully', vitals);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Phase 9B: Doctor Progress Notes (SOAP)
// ==========================================

export const createProgressNote = async (req, res, next) => {
  try {
    const note = await ipdService.createProgressNote(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user
    );
    return successResponse(res, 'Progress note created successfully', note, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getProgressNotes = async (req, res, next) => {
  try {
    const notes = await ipdService.getProgressNotes(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Progress notes retrieved successfully', notes);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getProgressNoteById = async (req, res, next) => {
  try {
    const note = await ipdService.getProgressNoteById(req.user.hospitalId, req.params.noteId);
    return successResponse(res, 'Progress note retrieved successfully', note);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateProgressNote = async (req, res, next) => {
  try {
    const note = await ipdService.updateProgressNote(
      req.user.hospitalId,
      req.params.noteId,
      req.body,
      req.user
    );
    return successResponse(res, 'Progress note updated successfully', note);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const finalizeProgressNote = async (req, res, next) => {
  try {
    const note = await ipdService.finalizeProgressNote(
      req.user.hospitalId,
      req.params.noteId,
      req.user
    );
    return successResponse(res, 'Progress note finalized successfully', note);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Phase 9B: Nursing Daily Notes
// ==========================================

export const createNursingNote = async (req, res, next) => {
  try {
    const note = await ipdService.createNursingNote(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user
    );
    return successResponse(res, 'Nursing note created successfully', note, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getNursingNotes = async (req, res, next) => {
  try {
    const notes = await ipdService.getNursingNotes(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Nursing notes retrieved successfully', notes);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getNursingNoteById = async (req, res, next) => {
  try {
    const note = await ipdService.getNursingNoteById(req.user.hospitalId, req.params.noteId);
    return successResponse(res, 'Nursing note retrieved successfully', note);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateNursingNote = async (req, res, next) => {
  try {
    const note = await ipdService.updateNursingNote(
      req.user.hospitalId,
      req.params.noteId,
      req.body,
      req.user
    );
    return successResponse(res, 'Nursing note updated successfully', note);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const finalizeNursingNote = async (req, res, next) => {
  try {
    const note = await ipdService.finalizeNursingNote(
      req.user.hospitalId,
      req.params.noteId,
      req.user
    );
    return successResponse(res, 'Nursing note finalized successfully', note);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Phase 9B: Clinical Context (Prescriptions & Labs)
// ==========================================

export const getAdmissionPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await ipdService.getAdmissionPrescriptions(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Admission prescriptions retrieved successfully', prescriptions);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const getAdmissionInvestigations = async (req, res, next) => {
  try {
    const investigations = await ipdService.getAdmissionInvestigations(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Admission investigations retrieved successfully', investigations);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Phase 9B: Chronological Clinical Timeline
// ==========================================

export const getAdmissionTimeline = async (req, res, next) => {
  try {
    const timeline = await ipdService.getAdmissionTimeline(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Admission timeline retrieved successfully', timeline);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// ==========================================
// Phase 9B: Discharge Workflow & Bed Release
// ==========================================

export const getDischargeSummary = async (req, res, next) => {
  try {
    const summary = await ipdService.getDischargeSummary(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Discharge summary retrieved successfully', summary);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const createOrUpdateDischargeSummary = async (req, res, next) => {
  try {
    const summary = await ipdService.createOrUpdateDischargeSummary(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user
    );
    return successResponse(res, 'Discharge summary saved successfully', summary);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const finalizeDischarge = async (req, res, next) => {
  try {
    const admission = await ipdService.finalizeDischargeAndReleaseBed(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user
    );
    return successResponse(res, 'Discharge finalized and bed released successfully', admission);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};
