import doctorScheduleService from '../services/doctorSchedule.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const listSchedules = async (req, res, next) => {
  try {
    const schedules = await doctorScheduleService.getDoctorSchedules(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Doctor schedules retrieved successfully', schedules);
  } catch (error) {
    return next(error);
  }
};

export const getSchedule = async (req, res, next) => {
  try {
    const schedule = await doctorScheduleService.getDoctorScheduleById(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Doctor schedule retrieved successfully', schedule);
  } catch (error) {
    return next(error);
  }
};

export const getSchedulesByDoctor = async (req, res, next) => {
  try {
    const schedules = await doctorScheduleService.getDoctorSchedulesByDoctorId(
      req.user.hospitalId,
      req.params.doctorId
    );
    return successResponse(res, 'Doctor schedules retrieved successfully', schedules);
  } catch (error) {
    return next(error);
  }
};

export const createSchedule = async (req, res, next) => {
  try {
    const schedule = await doctorScheduleService.createDoctorSchedule(
      req.user.hospitalId,
      req.body
    );
    return successResponse(res, 'Doctor schedule created successfully', schedule, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await doctorScheduleService.updateDoctorSchedule(
      req.user.hospitalId,
      req.params.id,
      req.body
    );
    return successResponse(res, 'Doctor schedule updated successfully', schedule);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const toggleScheduleStatus = async (req, res, next) => {
  try {
    const schedule = await doctorScheduleService.toggleDoctorScheduleStatus(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, 'Doctor schedule status updated successfully', schedule);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const deleteSchedule = async (req, res, next) => {
  try {
    const result = await doctorScheduleService.deleteDoctorSchedule(
      req.user.hospitalId,
      req.params.id
    );
    return successResponse(res, result.message, null);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  listSchedules,
  getSchedule,
  getSchedulesByDoctor,
  createSchedule,
  updateSchedule,
  toggleScheduleStatus,
  deleteSchedule,
};
