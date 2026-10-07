import pharmacyService from '../services/pharmacy.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * GET /api/pharmacy/dashboard/metrics
 */
export const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await pharmacyService.getPharmacyDashboardMetrics(req.user.hospitalId);
    return successResponse(res, 'Pharmacy metrics retrieved successfully', metrics);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/pharmacy/inventory
 */
export const getInventory = async (req, res, next) => {
  try {
    const result = await pharmacyService.getInventory(req.user.hospitalId, req.query);
    return successResponse(res, 'Inventory retrieved successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/pharmacy/inventory/stock-in
 */
export const stockIn = async (req, res, next) => {
  try {
    const batch = await pharmacyService.stockIn(req.user.hospitalId, req.body, req.user.id);
    return successResponse(res, 'Stock-in recorded successfully', batch, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/pharmacy/inventory/:id
 */
export const getBatchById = async (req, res, next) => {
  try {
    const batch = await pharmacyService.getBatchById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Batch details retrieved successfully', batch);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/pharmacy/inventory/:id/transactions
 */
export const getBatchTransactions = async (req, res, next) => {
  try {
    const transactions = await pharmacyService.getBatchTransactions(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Batch stock transactions retrieved successfully', transactions);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * PATCH /api/pharmacy/inventory/:id/status
 */
export const updateBatchStatus = async (req, res, next) => {
  try {
    const updated = await pharmacyService.updateBatchStatus(
      req.user.hospitalId,
      req.params.id,
      req.body.status,
      req.body.reason,
      req.user.id
    );
    return successResponse(res, 'Batch status updated successfully', updated);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/pharmacy/prescriptions
 */
export const getPrescriptionQueue = async (req, res, next) => {
  try {
    const queue = await pharmacyService.getPrescriptionQueue(req.user.hospitalId, req.query);
    return successResponse(res, 'Prescription queue retrieved successfully', queue);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/pharmacy/prescriptions/:id
 */
export const getPrescriptionForDispensing = async (req, res, next) => {
  try {
    const data = await pharmacyService.getPrescriptionForDispensing(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Prescription details for dispensing retrieved successfully', data);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/pharmacy/prescriptions/:id/dispense
 */
export const dispensePrescription = async (req, res, next) => {
  try {
    const dispensing = await pharmacyService.dispensePrescription(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Prescription dispensed successfully', dispensing, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/pharmacy/dispensings/:id
 */
export const getDispensingById = async (req, res, next) => {
  try {
    const dispensing = await pharmacyService.getDispensingById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Dispensing record retrieved successfully', dispensing);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/pharmacy/patients/:patientId/medication-history
 */
export const getPatientMedicationHistory = async (req, res, next) => {
  try {
    const history = await pharmacyService.getPatientMedicationHistory(req.user.hospitalId, req.params.patientId);
    return successResponse(res, 'Patient medication history retrieved successfully', history);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  getDashboardMetrics,
  getInventory,
  stockIn,
  getBatchById,
  getBatchTransactions,
  updateBatchStatus,
  getPrescriptionQueue,
  getPrescriptionForDispensing,
  dispensePrescription,
  getDispensingById,
  getPatientMedicationHistory,
};
