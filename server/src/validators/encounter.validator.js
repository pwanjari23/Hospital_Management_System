import { errorResponse } from '../utils/apiResponse.js';

const VALID_ENCOUNTER_TYPES = [
  'OPD',
  'FOLLOW_UP',
  'EECP_CONSULTATION',
  'EECP_SESSION',
  'EMERGENCY',
  'OTHER',
];

const VALID_ENCOUNTER_STATUSES = [
  'OPEN',
  'VITALS_PENDING',
  'READY_FOR_DOCTOR',
  'IN_CONSULTATION',
  'COMPLETED',
  'CANCELLED',
];

export const validateCreateEncounter = (req, res, next) => {
  const { patientId, doctorId, appointmentId, encounterType } = req.body;
  const errors = {};

  if (!patientId || typeof patientId !== 'string') {
    errors.patientId = 'Patient is required';
  }

  if (!doctorId && !appointmentId) {
    errors.doctorId = 'Doctor or associated Appointment is required';
  }

  if (encounterType && !VALID_ENCOUNTER_TYPES.includes(encounterType.toUpperCase())) {
    errors.encounterType = `Encounter type must be one of: ${VALID_ENCOUNTER_TYPES.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdateConsultation = (req, res, next) => {
  const { followUpDate } = req.body;
  const errors = {};


  if (followUpDate && !/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)) {
    errors.followUpDate = 'Follow-up date must be in YYYY-MM-DD format';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateEncounterStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || !VALID_ENCOUNTER_STATUSES.includes(status.toUpperCase())) {
    return errorResponse(
      res,
      `Status must be one of: ${VALID_ENCOUNTER_STATUSES.join(', ')}`,
      400
    );
  }
  return next();
};

export default {
  validateCreateEncounter,
  validateUpdateConsultation,
  validateEncounterStatus,
};
