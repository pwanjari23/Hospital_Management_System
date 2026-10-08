import { errorResponse } from '../utils/apiResponse.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateCreateSample = (req, res, next) => {
  const { sampleType, status, notes } = req.body;
  const errors = [];

  if (sampleType !== undefined && (typeof sampleType !== 'string' || sampleType.trim().length > 100)) {
    errors.push('Sample type cannot exceed 100 characters');
  }

  if (status !== undefined && !['PENDING_COLLECTION', 'COLLECTED'].includes(status)) {
    errors.push('Initial sample status must be PENDING_COLLECTION or COLLECTED');
  }

  if (notes !== undefined && typeof notes !== 'string') {
    errors.push('Notes must be a string');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateUpdateSample = (req, res, next) => {
  const { status, rejectionReason, notes } = req.body;
  const errors = [];

  const validStatuses = [
    'PENDING_COLLECTION',
    'COLLECTED',
    'RECEIVED',
    'REJECTED',
    'PROCESSING',
    'COMPLETED',
  ];

  if (status !== undefined && !validStatuses.includes(status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  if (status === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
    errors.push('Rejection reason is required when marking sample as REJECTED');
  }

  if (notes !== undefined && typeof notes !== 'string') {
    errors.push('Notes must be a string');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateSaveResult = (req, res, next) => {
  const {
    sampleId,
    resultType,
    resultValue,
    resultUnit,
    referenceRange,
    abnormalFlag,
    interpretation,
    observations,
    technicianNotes,
  } = req.body;
  const errors = [];

  if (sampleId !== undefined && sampleId !== null && !UUID_REGEX.test(sampleId)) {
    errors.push('Sample ID must be a valid UUID');
  }

  if (resultType !== undefined && !['QUANTITATIVE', 'QUALITATIVE', 'TEXT'].includes(resultType)) {
    errors.push('Result type must be QUANTITATIVE, QUALITATIVE, or TEXT');
  }

  if (resultValue !== undefined && resultValue !== null && typeof resultValue !== 'string' && typeof resultValue !== 'number') {
    errors.push('Result value must be a string or number');
  }

  if (resultUnit !== undefined && resultUnit !== null && typeof resultUnit !== 'string') {
    errors.push('Result unit must be a string');
  }

  if (referenceRange !== undefined && referenceRange !== null && typeof referenceRange !== 'string') {
    errors.push('Reference range must be a string');
  }

  const validFlags = ['NORMAL', 'LOW', 'HIGH', 'CRITICAL', 'ABNORMAL'];
  if (abnormalFlag !== undefined && !validFlags.includes(abnormalFlag)) {
    errors.push(`Abnormal flag must be one of: ${validFlags.join(', ')}`);
  }

  if (interpretation !== undefined && interpretation !== null && typeof interpretation !== 'string') {
    errors.push('Interpretation must be a string');
  }

  if (observations !== undefined && observations !== null && typeof observations !== 'string') {
    errors.push('Observations must be a string');
  }

  if (technicianNotes !== undefined && technicianNotes !== null && typeof technicianNotes !== 'string') {
    errors.push('Technician notes must be a string');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateResultAction = (req, res, next) => {
  const { notes } = req.body;
  const errors = [];

  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    errors.push('Notes must be a string');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export default {
  validateCreateSample,
  validateUpdateSample,
  validateSaveResult,
  validateResultAction,
};
