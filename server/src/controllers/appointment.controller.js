import appointmentService from '../services/appointment.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const listAppointments = async (req, res, next) => {
  try {
    const isDoctor = req.user.role === 'DOCTOR';
    const query = { ...req.query };

    // If logged in as Doctor and not Hospital Admin, default to self appointments
    if (isDoctor && !query.doctorId) {
      query.doctorId = req.user.id;
    }

    const result = await appointmentService.getAppointments(req.user.hospitalId, query);
    return successResponse(res, 'Appointments retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const getAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById(
      req.user.hospitalId,
      req.params.id
    );

    // If user is doctor, confirm ownership
    if (req.user.role === 'DOCTOR' && appointment.doctorId !== req.user.id) {
      return errorResponse(res, 'Access denied: You can only view your own appointments', 403);
    }

    return successResponse(res, 'Appointment retrieved successfully', appointment);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getSlots = async (req, res, next) => {
  try {
    const slots = await appointmentService.getAvailableSlots(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Available appointment slots generated successfully', slots);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const stats = await appointmentService.getAppointmentStats(
      req.user.hospitalId,
      req.query.date
    );
    return successResponse(res, 'Appointment statistics retrieved successfully', stats);
  } catch (error) {
    return next(error);
  }
};

export const bookAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.createAppointment(
      req.user.hospitalId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Appointment booked successfully', appointment, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointment(
      req.user.hospitalId,
      req.params.id,
      req.body
    );
    return successResponse(res, 'Appointment updated successfully', appointment);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointmentStatus(
      req.user.hospitalId,
      req.params.id,
      req.body
    );
    return successResponse(res, 'Appointment status updated successfully', appointment);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const reschedule = async (req, res, next) => {
  try {
    const appointment = await appointmentService.rescheduleAppointment(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Appointment rescheduled successfully', appointment);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const appointment = await appointmentService.cancelAppointment(
      req.user.hospitalId,
      req.params.id,
      req.body
    );
    return successResponse(res, 'Appointment cancelled successfully', appointment);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  listAppointments,
  getAppointment,
  getSlots,
  getStats,
  bookAppointment,
  updateAppointment,
  updateStatus,
  reschedule,
  cancel,
};
