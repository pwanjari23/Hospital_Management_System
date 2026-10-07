import vitalService from '../services/vital.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const listVitals = async (req, res, next) => {
  try {
    const vitals = await vitalService.getEncounterVitals(
      req.user.hospitalId,
      req.params.encounterId
    );
    return successResponse(res, 'Vitals retrieved successfully', vitals);
  } catch (error) {
    return next(error);
  }
};

export const createVital = async (req, res, next) => {
  try {
    const vital = await vitalService.createVital(
      req.user.hospitalId,
      req.params.encounterId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Vitals recorded successfully', vital, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const deleteVital = async (req, res, next) => {
  try {
    const result = await vitalService.deleteVital(
      req.user.hospitalId,
      req.params.id
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
  listVitals,
  createVital,
  deleteVital,
};
