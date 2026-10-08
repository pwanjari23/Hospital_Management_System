import { errorResponse } from '../utils/apiResponse.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateCreateService = (req, res, next) => {
  const { serviceCode, serviceName, category, defaultPrice, taxPercentage, departmentId } = req.body;
  const errors = [];

  if (!serviceCode || typeof serviceCode !== 'string' || !serviceCode.trim()) {
    errors.push('Service code is required');
  }

  if (!serviceName || typeof serviceName !== 'string' || !serviceName.trim()) {
    errors.push('Service name is required');
  }

  if (category !== undefined && (typeof category !== 'string' || !category.trim())) {
    errors.push('Category must be a non-empty string');
  }

  if (defaultPrice !== undefined && (isNaN(Number(defaultPrice)) || Number(defaultPrice) < 0)) {
    errors.push('Default price must be a non-negative number');
  }

  if (
    taxPercentage !== undefined &&
    (isNaN(Number(taxPercentage)) || Number(taxPercentage) < 0 || Number(taxPercentage) > 100)
  ) {
    errors.push('Tax percentage must be between 0 and 100');
  }

  if (departmentId && !UUID_REGEX.test(departmentId)) {
    errors.push('Invalid department ID format');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateUpdateService = (req, res, next) => {
  const { defaultPrice, taxPercentage, departmentId } = req.body;
  const errors = [];

  if (defaultPrice !== undefined && (isNaN(Number(defaultPrice)) || Number(defaultPrice) < 0)) {
    errors.push('Default price must be a non-negative number');
  }

  if (
    taxPercentage !== undefined &&
    (isNaN(Number(taxPercentage)) || Number(taxPercentage) < 0 || Number(taxPercentage) > 100)
  ) {
    errors.push('Tax percentage must be between 0 and 100');
  }

  if (departmentId !== undefined && departmentId !== null && !UUID_REGEX.test(departmentId)) {
    errors.push('Invalid department ID format');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateCreateInvoice = (req, res, next) => {
  const { patientId, items, discountAmount, encounterId, appointmentId } = req.body;
  const errors = [];

  if (!patientId || !UUID_REGEX.test(patientId)) {
    errors.push('Valid patient ID is required');
  }

  if (encounterId && !UUID_REGEX.test(encounterId)) {
    errors.push('Invalid encounter ID format');
  }

  if (appointmentId && !UUID_REGEX.test(appointmentId)) {
    errors.push('Invalid appointment ID format');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('At least one invoice item is required');
  } else {
    items.forEach((item, index) => {
      if (!item.description || typeof item.description !== 'string' || !item.description.trim()) {
        errors.push(`Item ${index + 1}: description is required`);
      }
      if (item.quantity !== undefined && (isNaN(Number(item.quantity)) || Number(item.quantity) <= 0)) {
        errors.push(`Item ${index + 1}: quantity must be greater than zero`);
      }
      if (item.unitPrice !== undefined && (isNaN(Number(item.unitPrice)) || Number(item.unitPrice) < 0)) {
        errors.push(`Item ${index + 1}: unit price cannot be negative`);
      }
      if (item.discountAmount !== undefined && (isNaN(Number(item.discountAmount)) || Number(item.discountAmount) < 0)) {
        errors.push(`Item ${index + 1}: discount cannot be negative`);
      }
      if (
        item.taxPercentage !== undefined &&
        (isNaN(Number(item.taxPercentage)) || Number(item.taxPercentage) < 0 || Number(item.taxPercentage) > 100)
      ) {
        errors.push(`Item ${index + 1}: tax percentage must be between 0 and 100`);
      }
      if (item.billingServiceId && !UUID_REGEX.test(item.billingServiceId)) {
        errors.push(`Item ${index + 1}: invalid billing service ID`);
      }
      if (item.sourceId && !UUID_REGEX.test(item.sourceId)) {
        errors.push(`Item ${index + 1}: invalid source ID`);
      }
    });
  }

  if (discountAmount !== undefined && (isNaN(Number(discountAmount)) || Number(discountAmount) < 0)) {
    errors.push('Discount amount cannot be negative');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateUpdateInvoice = (req, res, next) => {
  const { items, discountAmount } = req.body;
  const errors = [];

  if (items !== undefined) {
    if (!Array.isArray(items) || items.length === 0) {
      errors.push('Items must be a non-empty array');
    } else {
      items.forEach((item, index) => {
        if (!item.description || typeof item.description !== 'string' || !item.description.trim()) {
          errors.push(`Item ${index + 1}: description is required`);
        }
        if (item.quantity !== undefined && (isNaN(Number(item.quantity)) || Number(item.quantity) <= 0)) {
          errors.push(`Item ${index + 1}: quantity must be greater than zero`);
        }
        if (item.unitPrice !== undefined && (isNaN(Number(item.unitPrice)) || Number(item.unitPrice) < 0)) {
          errors.push(`Item ${index + 1}: unit price cannot be negative`);
        }
      });
    }
  }

  if (discountAmount !== undefined && (isNaN(Number(discountAmount)) || Number(discountAmount) < 0)) {
    errors.push('Discount amount cannot be negative');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateCancelInvoice = (req, res, next) => {
  const { cancellationReason } = req.body;
  const errors = [];

  if (!cancellationReason || typeof cancellationReason !== 'string' || !cancellationReason.trim()) {
    errors.push('Cancellation reason is mandatory');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateCollectPayment = (req, res, next) => {
  const { amount, paymentModeId, notes } = req.body;
  const errors = [];

  if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('Payment amount must be greater than zero');
  }

  if (paymentModeId && !UUID_REGEX.test(paymentModeId)) {
    errors.push('Invalid payment mode ID');
  }

  if (notes !== undefined && typeof notes !== 'string') {
    errors.push('Notes must be a string');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateRefundPayment = (req, res, next) => {
  const { amount, reason } = req.body;
  const errors = [];

  if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('Refund amount must be greater than zero');
  }

  if (reason !== undefined && typeof reason !== 'string') {
    errors.push('Reason must be a string');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};
