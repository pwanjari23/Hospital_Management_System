import { errorResponse } from '../utils/apiResponse.js';

const VALID_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

const toMinutes = (timeStr) => {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

export const validateCreateSchedule = (req, res, next) => {
  const {
    doctorId,
    dayOfWeek,
    startTime,
    endTime,
    breakStartTime,
    breakEndTime,
    slotDurationMinutes,
    maxAppointmentsPerSlot,
  } = req.body;

  const errors = {};

  if (!doctorId || typeof doctorId !== 'string') {
    errors.doctorId = 'Doctor is required';
  }

  if (!dayOfWeek || !VALID_DAYS.includes(dayOfWeek.toUpperCase())) {
    errors.dayOfWeek = `Day of week must be one of: ${VALID_DAYS.join(', ')}`;
  }

  if (!startTime || !TIME_REGEX.test(startTime)) {
    errors.startTime = 'Start time is required and must be in HH:MM format (24-hour)';
  }

  if (!endTime || !TIME_REGEX.test(endTime)) {
    errors.endTime = 'End time is required and must be in HH:MM format (24-hour)';
  }

  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);

  if (startMin !== null && endMin !== null && startMin >= endMin) {
    errors.endTime = 'End time must be later than start time';
  }

  if (breakStartTime || breakEndTime) {
    if (!breakStartTime || !TIME_REGEX.test(breakStartTime)) {
      errors.breakStartTime = 'Break start time must be in HH:MM format';
    }
    if (!breakEndTime || !TIME_REGEX.test(breakEndTime)) {
      errors.breakEndTime = 'Break end time must be in HH:MM format';
    }

    const bStartMin = toMinutes(breakStartTime);
    const bEndMin = toMinutes(breakEndTime);

    if (bStartMin !== null && bEndMin !== null) {
      if (bStartMin >= bEndMin) {
        errors.breakEndTime = 'Break end time must be later than break start time';
      }
      if (startMin !== null && endMin !== null) {
        if (bStartMin < startMin || bEndMin > endMin) {
          errors.breakStartTime = 'Break period must be inside working hours';
        }
      }
    }
  }

  if (slotDurationMinutes !== undefined) {
    const slotM = Number(slotDurationMinutes);
    if (isNaN(slotM) || slotM < 5 || slotM > 240) {
      errors.slotDurationMinutes = 'Slot duration must be between 5 and 240 minutes';
    }
  }

  if (maxAppointmentsPerSlot !== undefined) {
    const maxA = Number(maxAppointmentsPerSlot);
    if (isNaN(maxA) || maxA < 1 || maxA > 50) {
      errors.maxAppointmentsPerSlot = 'Maximum appointments per slot must be between 1 and 50';
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export const validateUpdateSchedule = (req, res, next) => {
  const {
    dayOfWeek,
    startTime,
    endTime,
    breakStartTime,
    breakEndTime,
    slotDurationMinutes,
    maxAppointmentsPerSlot,
  } = req.body;

  const errors = {};

  if (dayOfWeek && !VALID_DAYS.includes(dayOfWeek.toUpperCase())) {
    errors.dayOfWeek = `Day of week must be one of: ${VALID_DAYS.join(', ')}`;
  }

  if (startTime && !TIME_REGEX.test(startTime)) {
    errors.startTime = 'Start time must be in HH:MM format (24-hour)';
  }

  if (endTime && !TIME_REGEX.test(endTime)) {
    errors.endTime = 'End time must be in HH:MM format (24-hour)';
  }

  if (startTime && endTime) {
    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    if (startMin >= endMin) {
      errors.endTime = 'End time must be later than start time';
    }
  }

  if (breakStartTime || breakEndTime) {
    if (breakStartTime && !TIME_REGEX.test(breakStartTime)) {
      errors.breakStartTime = 'Break start time must be in HH:MM format';
    }
    if (breakEndTime && !TIME_REGEX.test(breakEndTime)) {
      errors.breakEndTime = 'Break end time must be in HH:MM format';
    }
  }

  if (slotDurationMinutes !== undefined) {
    const slotM = Number(slotDurationMinutes);
    if (isNaN(slotM) || slotM < 5 || slotM > 240) {
      errors.slotDurationMinutes = 'Slot duration must be between 5 and 240 minutes';
    }
  }

  if (maxAppointmentsPerSlot !== undefined) {
    const maxA = Number(maxAppointmentsPerSlot);
    if (isNaN(maxA) || maxA < 1 || maxA > 50) {
      errors.maxAppointmentsPerSlot = 'Maximum appointments per slot must be between 1 and 50';
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted fields.', 400, errors);
  }

  return next();
};

export default {
  validateCreateSchedule,
  validateUpdateSchedule,
};
