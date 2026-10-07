import { errorResponse } from '../utils/apiResponse.js';

const VALID_DIAGNOSIS_TYPES = ['PRIMARY', 'SECONDARY', 'DIFFERENTIAL'];

export const validateCreateDiagnosis = (req, res, next) => {
  const { diagnosisName, diagnosisType } = req.body;
  const errors = {};

  if (!diagnosisName || typeof diagnosisName !== 'string' || !diagnosisName.trim()) {
    errors.diagnosisName = 'Diagnosis name is required';
  }

  if (diagnosisType && !VALID_DIAGNOSIS_TYPES.includes(diagnosisType.toUpperCase())) {
    errors.diagnosisType = `Diagnosis type must be one of: ${VALID_DIAGNOSIS_TYPES.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdateDiagnosis = (req, res, next) => {
  const { diagnosisName, diagnosisType } = req.body;
  const errors = {};

  if (diagnosisName !== undefined && (!diagnosisName || !diagnosisName.trim())) {
    errors.diagnosisName = 'Diagnosis name cannot be empty';
  }

  if (diagnosisType !== undefined && !VALID_DIAGNOSIS_TYPES.includes(diagnosisType.toUpperCase())) {
    errors.diagnosisType = `Diagnosis type must be one of: ${VALID_DIAGNOSIS_TYPES.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export default {
  validateCreateDiagnosis,
  validateUpdateDiagnosis,
};
