import prescriptionService from '../services/prescription.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const listEncounterPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await prescriptionService.getEncounterPrescriptions(
      req.user.hospitalId,
      req.params.encounterId
    );
    return successResponse(res, 'Prescriptions retrieved successfully', prescriptions);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getPrescription = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.getPrescriptionById(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Prescription retrieved successfully', prescription);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const createPrescription = async (req, res, next) => {
  try {
    const encounterId = req.params.encounterId || req.body.encounterId;
    if (!encounterId) {
      return errorResponse(res, 'Encounter ID is required', 400);
    }

    const prescription = await prescriptionService.createPrescription(
      req.user.hospitalId,
      encounterId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Prescription created successfully', prescription, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updatePrescription = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.updatePrescription(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Prescription updated successfully', prescription);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const finalizePrescription = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.finalizePrescription(
      req.user.hospitalId,
      req.params.id,
      req.user.id
    );
    return successResponse(res, 'Prescription finalized successfully', prescription);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const cancelPrescription = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.cancelPrescription(
      req.user.hospitalId,
      req.params.id,
      req.body.cancellationReason,
      req.user.id
    );
    return successResponse(res, 'Prescription cancelled successfully', prescription);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const addItem = async (req, res, next) => {
  try {
    const item = await prescriptionService.addPrescriptionItem(
      req.user.hospitalId,
      req.params.prescriptionId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Prescription item added successfully', item, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateItem = async (req, res, next) => {
  try {
    const item = await prescriptionService.updatePrescriptionItem(
      req.user.hospitalId,
      req.params.prescriptionId,
      req.params.itemId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Prescription item updated successfully', item);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const deleteItem = async (req, res, next) => {
  try {
    const result = await prescriptionService.deletePrescriptionItem(
      req.user.hospitalId,
      req.params.prescriptionId,
      req.params.itemId
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
  listEncounterPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  finalizePrescription,
  cancelPrescription,
  addItem,
  updateItem,
  deleteItem,
};
