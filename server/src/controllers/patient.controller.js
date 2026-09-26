import patientService from '../services/patient.service.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * GET /api/patients
 * List patients for the authenticated hospital tenant with search, filtering, and pagination
 */
export const getPatients = async (req, res, next) => {
  try {
    const data = await patientService.getPatients(req.user.hospitalId, req.query);
    return successResponse(res, 'Patients retrieved successfully', data, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/patients/:id
 * Retrieve patient details by ID under strict tenant isolation
 */
export const getPatientById = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Patient details retrieved successfully', patient, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/patients
 * Register a new patient in the authenticated hospital tenant
 */
export const createPatient = async (req, res, next) => {
  try {
    const patient = await patientService.createPatient(req.user.hospitalId, req.body);
    return successResponse(res, 'Patient registered successfully', patient, 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/patients/:id
 * Update patient demographic/contact/medical details
 */
export const updatePatient = async (req, res, next) => {
  try {
    const patient = await patientService.updatePatient(
      req.user.hospitalId,
      req.params.id,
      req.body
    );
    return successResponse(res, 'Patient updated successfully', patient, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/patients/:id/status
 * Activate or deactivate a patient
 */
export const updatePatientStatus = async (req, res, next) => {
  try {
    const patient = await patientService.updatePatientStatus(
      req.user.hospitalId,
      req.params.id,
      req.body.isActive
    );
    const actionLabel = req.body.isActive ? 'activated' : 'deactivated';
    return successResponse(res, `Patient ${actionLabel} successfully`, patient, 200);
  } catch (error) {
    return next(error);
  }
};

export default {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  updatePatientStatus,
};
