import encounterService from '../services/encounter.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const listEncounters = async (req, res, next) => {
  try {
    const isDoctor = req.user.role === 'DOCTOR';
    const query = { ...req.query };

    // If logged in as Doctor and not explicitly querying another doctor, default to own encounters
    if (isDoctor && !query.doctorId) {
      query.doctorId = req.user.id;
    }

    const result = await encounterService.getEncounters(req.user.hospitalId, query);
    return successResponse(res, 'Encounters retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const getEncounter = async (req, res, next) => {
  try {
    const encounter = await encounterService.getEncounterById(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Encounter retrieved successfully', encounter);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const createEncounter = async (req, res, next) => {
  try {
    const encounter = await encounterService.createEncounter(
      req.user.hospitalId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Clinical encounter created successfully', encounter, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateConsultation = async (req, res, next) => {
  try {
    const encounter = await encounterService.updateConsultation(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Consultation notes updated successfully', encounter);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const completeEncounter = async (req, res, next) => {
  try {
    const encounter = await encounterService.completeEncounter(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Consultation completed successfully', encounter);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getPatientTimeline = async (req, res, next) => {
  try {
    const timeline = await encounterService.getPatientEncounterHistory(
      req.user.hospitalId,
      req.params.patientId
    );
    return successResponse(res, 'Patient clinical timeline retrieved successfully', timeline);
  } catch (error) {
    return next(error);
  }
};

export default {
  listEncounters,
  getEncounter,
  createEncounter,
  updateConsultation,
  completeEncounter,
  getPatientTimeline,
};
