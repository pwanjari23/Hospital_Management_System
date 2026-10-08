import laboratoryService from '../services/laboratory.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * GET /api/laboratory/dashboard/metrics
 */
export const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await laboratoryService.getLaboratoryDashboardMetrics(req.user.hospitalId);
    return successResponse(res, 'Laboratory metrics retrieved successfully', metrics);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/laboratory/orders
 */
export const getLaboratoryQueue = async (req, res, next) => {
  try {
    const result = await laboratoryService.getLaboratoryQueue(req.user.hospitalId, req.query);
    return successResponse(res, 'Laboratory queue retrieved successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/laboratory/orders/:orderId
 */
export const getOrderDetails = async (req, res, next) => {
  try {
    const order = await laboratoryService.getLaboratoryOrderDetails(
      req.user.hospitalId,
      req.params.orderId
    );
    return successResponse(res, 'Laboratory order details retrieved successfully', order);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/laboratory/orders/:orderId/sample
 */
export const createOrCollectSample = async (req, res, next) => {
  try {
    const sample = await laboratoryService.createOrCollectSample(
      req.user.hospitalId,
      req.params.orderId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Sample collected successfully', sample, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * PATCH /api/laboratory/samples/:sampleId
 */
export const updateSampleStatus = async (req, res, next) => {
  try {
    const sample = await laboratoryService.updateSampleStatus(
      req.user.hospitalId,
      req.params.sampleId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Sample status updated successfully', sample);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/laboratory/orders/:orderId/result
 */
export const saveResult = async (req, res, next) => {
  try {
    const result = await laboratoryService.saveResult(
      req.user.hospitalId,
      req.params.orderId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Investigation result saved successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/laboratory/results/:resultId/verify
 */
export const verifyResult = async (req, res, next) => {
  try {
    const result = await laboratoryService.verifyResult(
      req.user.hospitalId,
      req.params.resultId,
      req.body.notes,
      req.user.id
    );
    return successResponse(res, 'Investigation result verified successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/laboratory/results/:resultId/finalize
 */
export const finalizeResult = async (req, res, next) => {
  try {
    const result = await laboratoryService.finalizeResult(
      req.user.hospitalId,
      req.params.resultId,
      req.body.notes,
      req.user.id
    );
    return successResponse(res, 'Investigation result finalized successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/laboratory/results/:resultId
 */
export const getResultById = async (req, res, next) => {
  try {
    const result = await laboratoryService.getResultById(
      req.user.hospitalId,
      req.params.resultId
    );
    return successResponse(res, 'Investigation result retrieved successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/laboratory/encounters/:encounterId/results
 */
export const getEncounterResults = async (req, res, next) => {
  try {
    const results = await laboratoryService.getEncounterResults(
      req.user.hospitalId,
      req.params.encounterId
    );
    return successResponse(res, 'Encounter results retrieved successfully', results);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/laboratory/patients/:patientId/results
 */
export const getPatientInvestigationHistory = async (req, res, next) => {
  try {
    const results = await laboratoryService.getPatientInvestigationHistory(
      req.user.hospitalId,
      req.params.patientId
    );
    return successResponse(res, 'Patient investigation history retrieved successfully', results);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  getDashboardMetrics,
  getLaboratoryQueue,
  getOrderDetails,
  createOrCollectSample,
  updateSampleStatus,
  saveResult,
  verifyResult,
  finalizeResult,
  getResultById,
  getEncounterResults,
  getPatientInvestigationHistory,
};
