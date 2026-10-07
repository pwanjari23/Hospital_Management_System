import { errorResponse } from '../utils/apiResponse.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateStockIn = (req, res, next) => {
  const { medicineId, batchNumber, expiryDate, quantity, purchaseRate, sellingRate, reorderLevel } = req.body;
  const errors = [];

  if (!medicineId || !UUID_REGEX.test(medicineId)) {
    errors.push('Valid medicine ID (UUID) is required');
  }

  if (!batchNumber || typeof batchNumber !== 'string' || !batchNumber.trim()) {
    errors.push('Batch number is required');
  } else if (batchNumber.trim().length > 100) {
    errors.push('Batch number cannot exceed 100 characters');
  }

  if (!expiryDate) {
    errors.push('Expiry date is required');
  } else {
    const d = new Date(expiryDate);
    if (isNaN(d.getTime())) {
      errors.push('Expiry date must be a valid date');
    }
  }

  const qty = Number(quantity);
  if (quantity === undefined || isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
    errors.push('Quantity must be a positive whole integer');
  }

  if (purchaseRate !== undefined && purchaseRate !== null && purchaseRate !== '') {
    const pr = Number(purchaseRate);
    if (isNaN(pr) || pr < 0) {
      errors.push('Purchase rate must be a non-negative number');
    }
  }

  if (sellingRate !== undefined && sellingRate !== null && sellingRate !== '') {
    const sr = Number(sellingRate);
    if (isNaN(sr) || sr < 0) {
      errors.push('Selling rate must be a non-negative number');
    }
  }

  if (reorderLevel !== undefined && reorderLevel !== null && reorderLevel !== '') {
    const rl = Number(reorderLevel);
    if (isNaN(rl) || !Number.isInteger(rl) || rl < 0) {
      errors.push('Reorder level must be a non-negative integer');
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateDispense = (req, res, next) => {
  const { items } = req.body;
  const errors = [];

  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('At least one medication item must be specified for dispensing');
  } else {
    items.forEach((item, idx) => {
      if (!item.prescriptionItemId || !UUID_REGEX.test(item.prescriptionItemId)) {
        errors.push(`Item ${idx + 1}: Valid prescriptionItemId (UUID) is required`);
      }

      if (!item.batchAllocations || !Array.isArray(item.batchAllocations) || item.batchAllocations.length === 0) {
        errors.push(`Item ${idx + 1}: At least one batch allocation is required`);
      } else {
        item.batchAllocations.forEach((alloc, allocIdx) => {
          if (!alloc.batchId || !UUID_REGEX.test(alloc.batchId)) {
            errors.push(`Item ${idx + 1}, Allocation ${allocIdx + 1}: Valid batchId (UUID) is required`);
          }
          const q = Number(alloc.quantity);
          if (alloc.quantity === undefined || isNaN(q) || !Number.isInteger(q) || q <= 0) {
            errors.push(`Item ${idx + 1}, Allocation ${allocIdx + 1}: Quantity must be a positive integer`);
          }
        });
      }
    });
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateBatchStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || !['ACTIVE', 'BLOCKED'].includes(status)) {
    return errorResponse(res, 'Status must be either ACTIVE or BLOCKED', 400);
  }
  next();
};

export default {
  validateStockIn,
  validateDispense,
  validateBatchStatus,
};
