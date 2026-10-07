import { errorResponse } from '../utils/apiResponse.js';

export const validateUpsertAssessment = (req, res, next) => {
  const { suitabilityAssessment, recommendedSessions } = req.body;
  const errors = {};

  const allowedSuitability = [
    'SUITABLE',
    'UNSUITABLE',
    'REQUIRES_FURTHER_EVALUATION',
    'CONTRAINDICATED',
  ];

  if (suitabilityAssessment && !allowedSuitability.includes(suitabilityAssessment)) {
    errors.suitabilityAssessment = `Suitability must be one of: ${allowedSuitability.join(', ')}`;
  }

  if (recommendedSessions !== undefined && recommendedSessions !== null && recommendedSessions !== '') {
    const num = Number(recommendedSessions);
    if (!Number.isInteger(num) || num <= 0 || num > 100) {
      errors.recommendedSessions = 'Recommended sessions must be an integer between 1 and 100';
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateCreateCourse = (req, res, next) => {
  const { patientId, plannedSessions, startDate } = req.body;
  const errors = {};

  if (!patientId || typeof patientId !== 'string') {
    errors.patientId = 'Patient is required';
  }

  if (plannedSessions === undefined || plannedSessions === null || plannedSessions === '') {
    errors.plannedSessions = 'Planned sessions count is required';
  } else {
    const num = Number(plannedSessions);
    if (!Number.isInteger(num) || num <= 0 || num > 100) {
      errors.plannedSessions = 'Planned sessions must be an integer between 1 and 100';
    }
  }

  if (startDate && isNaN(Date.parse(startDate))) {
    errors.startDate = 'Start date must be a valid date format';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdateCourse = (req, res, next) => {
  const { plannedSessions, startDate } = req.body;
  const errors = {};

  if (plannedSessions !== undefined && plannedSessions !== null) {
    const num = Number(plannedSessions);
    if (!Number.isInteger(num) || num <= 0 || num > 100) {
      errors.plannedSessions = 'Planned sessions must be an integer between 1 and 100';
    }
  }

  if (startDate && isNaN(Date.parse(startDate))) {
    errors.startDate = 'Start date must be a valid date format';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateCourseStatus = (req, res, next) => {
  const { status } = req.body;
  const allowed = ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];

  if (!status || !allowed.includes(status)) {
    return errorResponse(
      res,
      `Course status is invalid. Allowed: ${allowed.join(', ')}`,
      400,
      { status: `Must be one of ${allowed.join(', ')}` }
    );
  }

  return next();
};

export const validateScheduleSession = (req, res, next) => {
  const { scheduledDate, sessionNumber } = req.body;
  const errors = {};

  if (!scheduledDate) {
    errors.scheduledDate = 'Scheduled date is required';
  } else if (isNaN(Date.parse(scheduledDate))) {
    errors.scheduledDate = 'Scheduled date must be a valid date format';
  }

  if (sessionNumber !== undefined && sessionNumber !== null) {
    const num = Number(sessionNumber);
    if (!Number.isInteger(num) || num <= 0) {
      errors.sessionNumber = 'Session number must be a positive integer';
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateSessionStatus = (req, res, next) => {
  const { status, cancellationReason } = req.body;
  const allowed = [
    'SCHEDULED',
    'PRE_ASSESSMENT',
    'IN_PROGRESS',
    'PAUSED',
    'COMPLETED',
    'CANCELLED',
  ];

  if (!status || !allowed.includes(status)) {
    return errorResponse(
      res,
      `Session status is invalid. Allowed: ${allowed.join(', ')}`,
      400,
      { status: `Must be one of ${allowed.join(', ')}` }
    );
  }

  if (status === 'CANCELLED' && cancellationReason && typeof cancellationReason !== 'string') {
    return errorResponse(res, 'Cancellation reason must be a valid string', 400, {
      cancellationReason: 'Must be text',
    });
  }

  return next();
};

export const validatePreAssessment = (req, res, next) => {
  const { systolicBp, diastolicBp, pulseRate, spo2, weightKg } = req.body;
  const errors = {};

  if (systolicBp !== undefined && systolicBp !== null && systolicBp !== '') {
    const val = Number(systolicBp);
    if (isNaN(val) || val < 40 || val > 300) {
      errors.systolicBp = 'Systolic BP must be between 40 and 300 mmHg';
    }
  }

  if (diastolicBp !== undefined && diastolicBp !== null && diastolicBp !== '') {
    const val = Number(diastolicBp);
    if (isNaN(val) || val < 20 || val > 200) {
      errors.diastolicBp = 'Diastolic BP must be between 20 and 200 mmHg';
    }
  }

  if (pulseRate !== undefined && pulseRate !== null && pulseRate !== '') {
    const val = Number(pulseRate);
    if (isNaN(val) || val < 30 || val > 250) {
      errors.pulseRate = 'Pulse rate must be between 30 and 250 bpm';
    }
  }

  if (spo2 !== undefined && spo2 !== null && spo2 !== '') {
    const val = Number(spo2);
    if (isNaN(val) || val < 50 || val > 100) {
      errors.spo2 = 'SpO2 must be between 50 and 100%';
    }
  }

  if (weightKg !== undefined && weightKg !== null && weightKg !== '') {
    const val = Number(weightKg);
    if (isNaN(val) || val < 1 || val > 500) {
      errors.weightKg = 'Weight must be between 1 and 500 kg';
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateAddReading = (req, res, next) => {
  const { systolicBp, diastolicBp, pulseRate, spo2, treatmentPressure } = req.body;
  const errors = {};

  if (systolicBp !== undefined && systolicBp !== null && systolicBp !== '') {
    const val = Number(systolicBp);
    if (isNaN(val) || val < 40 || val > 300) {
      errors.systolicBp = 'Systolic BP must be between 40 and 300 mmHg';
    }
  }

  if (diastolicBp !== undefined && diastolicBp !== null && diastolicBp !== '') {
    const val = Number(diastolicBp);
    if (isNaN(val) || val < 20 || val > 200) {
      errors.diastolicBp = 'Diastolic BP must be between 20 and 200 mmHg';
    }
  }

  if (pulseRate !== undefined && pulseRate !== null && pulseRate !== '') {
    const val = Number(pulseRate);
    if (isNaN(val) || val < 30 || val > 250) {
      errors.pulseRate = 'Pulse rate must be between 30 and 250 bpm';
    }
  }

  if (spo2 !== undefined && spo2 !== null && spo2 !== '') {
    const val = Number(spo2);
    if (isNaN(val) || val < 50 || val > 100) {
      errors.spo2 = 'SpO2 must be between 50 and 100%';
    }
  }

  if (treatmentPressure !== undefined && treatmentPressure !== null && treatmentPressure !== '') {
    const val = Number(treatmentPressure);
    if (isNaN(val) || val < 50 || val > 400) {
      errors.treatmentPressure = 'Treatment pressure must be between 50 and 400 mmHg';
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export default {
  validateUpsertAssessment,
  validateCreateCourse,
  validateUpdateCourse,
  validateCourseStatus,
  validateScheduleSession,
  validateSessionStatus,
  validatePreAssessment,
  validateAddReading,
};
