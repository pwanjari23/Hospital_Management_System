import clinicalMasterService from '../services/clinicalMaster.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// 1. Medicines
export const getMedicines = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.getMedicines(req.user.hospitalId, req.query);
    return successResponse(res, 'Medicines retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const createMedicine = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.createMedicine(req.user.hospitalId, req.body);
    return successResponse(res, 'Medicine created successfully', result, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateMedicine = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.updateMedicine(req.user.hospitalId, req.params.id, req.body);
    return successResponse(res, 'Medicine updated successfully', result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateMedicineStatus = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.updateMedicineStatus(req.user.hospitalId, req.params.id, req.body.status);
    return successResponse(res, `Medicine status updated to ${req.body.status}`, result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// 2. Investigations
export const getInvestigations = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.getInvestigations(req.user.hospitalId, req.query);
    return successResponse(res, 'Investigations retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const createInvestigation = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.createInvestigation(req.user.hospitalId, req.body);
    return successResponse(res, 'Investigation created successfully', result, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateInvestigation = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.updateInvestigation(req.user.hospitalId, req.params.id, req.body);
    return successResponse(res, 'Investigation updated successfully', result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateInvestigationStatus = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.updateInvestigationStatus(req.user.hospitalId, req.params.id, req.body.status);
    return successResponse(res, `Investigation status updated to ${req.body.status}`, result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// 3. Treatments
export const getTreatments = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.getTreatments(req.user.hospitalId, req.query);
    return successResponse(res, 'Treatments retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const createTreatment = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.createTreatment(req.user.hospitalId, req.body);
    return successResponse(res, 'Treatment created successfully', result, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateTreatment = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.updateTreatment(req.user.hospitalId, req.params.id, req.body);
    return successResponse(res, 'Treatment updated successfully', result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateTreatmentStatus = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.updateTreatmentStatus(req.user.hospitalId, req.params.id, req.body.status);
    return successResponse(res, `Treatment status updated to ${req.body.status}`, result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// 4. EECP Packages
export const getEecpPackages = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.getEecpPackages(req.user.hospitalId, req.query);
    return successResponse(res, 'EECP Packages retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const createEecpPackage = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.createEecpPackage(req.user.hospitalId, req.body);
    return successResponse(res, 'EECP Package created successfully', result, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateEecpPackage = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.updateEecpPackage(req.user.hospitalId, req.params.id, req.body);
    return successResponse(res, 'EECP Package updated successfully', result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updateEecpPackageStatus = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.updateEecpPackageStatus(req.user.hospitalId, req.params.id, req.body.status);
    return successResponse(res, `EECP Package status updated to ${req.body.status}`, result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

// 5. Payment Modes
export const getPaymentModes = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.getPaymentModes(req.user.hospitalId, req.query);
    return successResponse(res, 'Payment Modes retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const createPaymentMode = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.createPaymentMode(req.user.hospitalId, req.body);
    return successResponse(res, 'Payment Mode created successfully', result, 201);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updatePaymentMode = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.updatePaymentMode(req.user.hospitalId, req.params.id, req.body);
    return successResponse(res, 'Payment Mode updated successfully', result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export const updatePaymentModeStatus = async (req, res, next) => {
  try {
    const result = await clinicalMasterService.updatePaymentModeStatus(req.user.hospitalId, req.params.id, req.body.status);
    return successResponse(res, `Payment Mode status updated to ${req.body.status}`, result);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export default {
  getMedicines,
  createMedicine,
  updateMedicine,
  updateMedicineStatus,
  getInvestigations,
  createInvestigation,
  updateInvestigation,
  updateInvestigationStatus,
  getTreatments,
  createTreatment,
  updateTreatment,
  updateTreatmentStatus,
  getEecpPackages,
  createEecpPackage,
  updateEecpPackage,
  updateEecpPackageStatus,
  getPaymentModes,
  createPaymentMode,
  updatePaymentMode,
  updatePaymentModeStatus,
};
