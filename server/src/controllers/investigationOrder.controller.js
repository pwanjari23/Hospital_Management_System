import investigationOrderService from '../services/investigationOrder.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const listEncounterInvestigationOrders = async (req, res, next) => {
  try {
    const orders = await investigationOrderService.getEncounterInvestigationOrders(
      req.user.hospitalId,
      req.params.encounterId
    );
    return successResponse(res, 'Investigation orders retrieved successfully', orders);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getInvestigationOrder = async (req, res, next) => {
  try {
    const order = await investigationOrderService.getInvestigationOrderById(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Investigation order retrieved successfully', order);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const createInvestigationOrder = async (req, res, next) => {
  try {
    const encounterId = req.params.encounterId || req.body.encounterId;
    if (!encounterId) {
      return errorResponse(res, 'Encounter ID is required', 400);
    }

    if (Array.isArray(req.body.items)) {
      const orders = await investigationOrderService.createBatchInvestigationOrders(
        req.user.hospitalId,
        encounterId,
        req.body.items,
        req.user.id
      );
      return successResponse(res, 'Investigation orders created successfully', orders, 201);
    }

    const order = await investigationOrderService.createInvestigationOrder(
      req.user.hospitalId,
      encounterId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Investigation order created successfully', order, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateInvestigationOrder = async (req, res, next) => {
  try {
    const order = await investigationOrderService.updateInvestigationOrder(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Investigation order updated successfully', order);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const finalizeInvestigationOrder = async (req, res, next) => {
  try {
    const order = await investigationOrderService.finalizeInvestigationOrder(
      req.user.hospitalId,
      req.params.id,
      req.user.id
    );
    return successResponse(res, 'Investigation order finalized successfully', order);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const cancelInvestigationOrder = async (req, res, next) => {
  try {
    const order = await investigationOrderService.cancelInvestigationOrder(
      req.user.hospitalId,
      req.params.id,
      req.body.cancellationReason,
      req.user.id
    );
    return successResponse(res, 'Investigation order cancelled successfully', order);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const deleteInvestigationOrder = async (req, res, next) => {
  try {
    const result = await investigationOrderService.deleteInvestigationOrder(
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
  listEncounterInvestigationOrders,
  getInvestigationOrder,
  createInvestigationOrder,
  updateInvestigationOrder,
  finalizeInvestigationOrder,
  cancelInvestigationOrder,
  deleteInvestigationOrder,
};
