import billingService from '../services/billing.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * GET /api/billing/dashboard
 */
export const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await billingService.getBillingDashboardMetrics(req.user.hospitalId);
    return successResponse(res, 'Billing metrics retrieved successfully', metrics);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/billing/services
 */
export const getBillingServices = async (req, res, next) => {
  try {
    const result = await billingService.getBillingServices(req.user.hospitalId, req.query);
    return successResponse(res, 'Billing services retrieved successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/billing/services
 */
export const createBillingService = async (req, res, next) => {
  try {
    const service = await billingService.createBillingService(
      req.user.hospitalId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Billing service created successfully', service, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * PATCH /api/billing/services/:id
 */
export const updateBillingService = async (req, res, next) => {
  try {
    const service = await billingService.updateBillingService(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Billing service updated successfully', service);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/billing/invoices
 */
export const getInvoices = async (req, res, next) => {
  try {
    const result = await billingService.getInvoices(req.user.hospitalId, req.query);
    return successResponse(res, 'Invoices retrieved successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/billing/invoices
 */
export const createInvoice = async (req, res, next) => {
  try {
    const invoice = await billingService.createInvoice(
      req.user.hospitalId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Invoice created successfully', invoice, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/billing/invoices/:id
 */
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await billingService.getInvoiceById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Invoice retrieved successfully', invoice);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * PATCH /api/billing/invoices/:id
 */
export const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await billingService.updateInvoice(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Invoice updated successfully', invoice);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/billing/invoices/:id/issue
 */
export const issueInvoice = async (req, res, next) => {
  try {
    const invoice = await billingService.issueInvoice(
      req.user.hospitalId,
      req.params.id,
      req.user.id
    );
    return successResponse(res, 'Invoice issued successfully', invoice);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/billing/invoices/:id/cancel
 */
export const cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await billingService.cancelInvoice(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Invoice cancelled successfully', invoice);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/billing/invoices/:id/payments
 */
export const collectPayment = async (req, res, next) => {
  try {
    const result = await billingService.collectPayment(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Payment collected successfully', result, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/billing/payments/:id
 */
export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await billingService.getPaymentById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Payment retrieved successfully', payment);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * POST /api/billing/payments/:id/refund
 */
export const refundPayment = async (req, res, next) => {
  try {
    const result = await billingService.refundPayment(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Payment refunded successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/billing/receipts/:id
 */
export const getReceiptById = async (req, res, next) => {
  try {
    const receipt = await billingService.getReceiptById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Receipt retrieved successfully', receipt);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/billing/patients/:patientId/financial-history
 */
export const getPatientFinancialHistory = async (req, res, next) => {
  try {
    const history = await billingService.getPatientFinancialHistory(
      req.user.hospitalId,
      req.params.patientId
    );
    return successResponse(res, 'Patient financial history retrieved successfully', history);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

/**
 * GET /api/billing/patients/:patientId/unbilled-items
 */
export const getUnbilledItemsForPatient = async (req, res, next) => {
  try {
    const items = await billingService.getUnbilledItemsForPatient(
      req.user.hospitalId,
      req.params.patientId
    );
    return successResponse(res, 'Unbilled items retrieved successfully', items);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  getDashboardMetrics,
  getBillingServices,
  createBillingService,
  updateBillingService,
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  collectPayment,
  getPaymentById,
  refundPayment,
  getReceiptById,
  getPatientFinancialHistory,
  getUnbilledItemsForPatient,
};
