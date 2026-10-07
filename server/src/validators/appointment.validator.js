import { errorResponse } from '../utils/apiResponse.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

const VALID_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'RESCHEDULED',
];

const VALID_PAYMENT_STATUSES = ['PENDING', 'PAID', 'EXEMPT', 'PARTIAL'];

export const validateCreateAppointment = (req, res, next) => {
  const {
    patientId,
    doctorId,
    appointmentDate,
    startTime,
    endTime,
    appointmentType,
    consultationFee,
    paymentStatus,
  } = req.body;

  const errors = {};

  if (!patientId || typeof patientId !== 'string') {
    errors.patientId = 'Patient is required';
  }

  if (!doctorId || typeof doctorId !== 'string') {
    errors.doctorId = 'Doctor is required';
  }

  if (!appointmentDate || !DATE_REGEX.test(appointmentDate)) {
    errors.appointmentDate = 'Appointment date is required (YYYY-MM-DD)';
  }

  if (!startTime || !TIME_REGEX.test(startTime)) {
    errors.startTime = 'Start time is required (HH:MM)';
  }

  if (!endTime || !TIME_REGEX.test(endTime)) {
    errors.endTime = 'End time is required (HH:MM)';
  }

  if (appointmentType && typeof appointmentType === 'string' && appointmentType.trim().length > 50) {
    errors.appointmentType = 'Appointment type cannot exceed 50 characters';
  }

  if (consultationFee !== undefined) {
    const fee = Number(consultationFee);
    if (isNaN(fee) || fee < 0) {
      errors.consultationFee = 'Consultation fee must be a non-negative number';
    }
  }

  if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus.toUpperCase())) {
    errors.paymentStatus = `Payment status must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdateAppointment = (req, res, next) => {
  const { appointmentType, consultationFee, paymentStatus, reason, notes } = req.body;
  const errors = {};

  if (appointmentType !== undefined && (!appointmentType || appointmentType.trim().length > 50)) {
    errors.appointmentType = 'Appointment type must be valid';
  }

  if (consultationFee !== undefined) {
    const fee = Number(consultationFee);
    if (isNaN(fee) || fee < 0) {
      errors.consultationFee = 'Consultation fee must be a non-negative number';
    }
  }

  if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus.toUpperCase())) {
    errors.paymentStatus = `Payment status must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}`;
  }

  if (reason && reason.length > 2000) {
    errors.reason = 'Reason cannot exceed 2000 characters';
  }

  if (notes && notes.length > 2000) {
    errors.notes = 'Notes cannot exceed 2000 characters';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdateStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
    return errorResponse(
      res,
      `Invalid appointment status. Allowed: ${VALID_STATUSES.join(', ')}`,
      400
    );
  }
  return next();
};

export const validateReschedule = (req, res, next) => {
  const { appointmentDate, startTime, endTime } = req.body;
  const errors = {};

  if (!appointmentDate || !DATE_REGEX.test(appointmentDate)) {
    errors.appointmentDate = 'New appointment date is required (YYYY-MM-DD)';
  }

  if (!startTime || !TIME_REGEX.test(startTime)) {
    errors.startTime = 'New start time is required (HH:MM)';
  }

  if (!endTime || !TIME_REGEX.test(endTime)) {
    errors.endTime = 'New end time is required (HH:MM)';
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateCancel = (req, res, next) => {
  const { cancellationReason } = req.body;
  if (!cancellationReason || typeof cancellationReason !== 'string' || !cancellationReason.trim()) {
    return errorResponse(res, 'Cancellation reason is required.', 400, {
      cancellationReason: 'Please provide a reason for cancelling this appointment.',
    });
  }
  return next();
};

export default {
  validateCreateAppointment,
  validateUpdateAppointment,
  validateUpdateStatus,
  validateReschedule,
  validateCancel,
};
