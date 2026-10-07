import encounterDiagnosisService from '../services/encounterDiagnosis.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const listDiagnoses = async (req, res, next) => {
  try {
    const diagnoses = await encounterDiagnosisService.getEncounterDiagnoses(
      req.user.hospitalId,
      req.params.encounterId
    );
    return successResponse(res, 'Diagnoses retrieved successfully', diagnoses);
  } catch (error) {
    return next(error);
  }
};

export const addDiagnosis = async (req, res, next) => {
  try {
    const diagnosis = await encounterDiagnosisService.addDiagnosis(
      req.user.hospitalId,
      req.params.encounterId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Diagnosis recorded successfully', diagnosis, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateDiagnosis = async (req, res, next) => {
  try {
    const diagnosis = await encounterDiagnosisService.updateDiagnosis(
      req.user.hospitalId,
      req.params.diagnosisId,
      req.body
    );
    return successResponse(res, 'Diagnosis updated successfully', diagnosis);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const deleteDiagnosis = async (req, res, next) => {
  try {
    const result = await encounterDiagnosisService.deleteDiagnosis(
      req.user.hospitalId,
      req.params.diagnosisId
    );
    return successResponse(res, result.message, null);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  listDiagnoses,
  addDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
};
