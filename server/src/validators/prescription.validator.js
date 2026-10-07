import { errorResponse } from '../utils/apiResponse.js';

export const validateCreatePrescription = (req, res, next) => {
  const { items } = req.body;
  const errors = {};

  if (items !== undefined) {
    if (!Array.isArray(items)) {
      errors.items = 'Items must be an array';
    } else {
      items.forEach((item, index) => {
        if (!item.medicineId) {
          errors[`items[${index}].medicineId`] = 'Medicine is required for all items';
        }
        if (!item.dosage || !item.dosage.trim()) {
          errors[`items[${index}].dosage`] = 'Dosage is required for all items';
        }
        if (!item.frequency || !item.frequency.trim()) {
          errors[`items[${index}].frequency`] = 'Frequency is required for all items';
        }
      });
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateAddPrescriptionItem = (req, res, next) => {
  const { medicineId, dosage, frequency } = req.body;
  const errors = {};

  if (!medicineId) {
    errors.medicineId = 'Medicine is required';
  }

  if (!dosage || typeof dosage !== 'string' || !dosage.trim()) {
    errors.dosage = 'Dosage is required (e.g. 1 tablet, 500 mg)';
  }

  if (!frequency || typeof frequency !== 'string' || !frequency.trim()) {
    errors.frequency = 'Frequency is required (e.g. Once Daily, Twice Daily, 1-0-1)';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdatePrescriptionItem = (req, res, next) => {
  const { dosage, frequency } = req.body;
  const errors = {};

  if (dosage !== undefined && (!dosage || !dosage.trim())) {
    errors.dosage = 'Dosage cannot be empty';
  }

  if (frequency !== undefined && (!frequency || !frequency.trim())) {
    errors.frequency = 'Frequency cannot be empty';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export default {
  validateCreatePrescription,
  validateAddPrescriptionItem,
  validateUpdatePrescriptionItem,
};
