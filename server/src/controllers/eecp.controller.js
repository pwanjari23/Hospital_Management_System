import eecpService from '../services/eecp.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// --- Assessment Handlers ---

export const getEncounterAssessment = async (req, res, next) => {
  try {
    const assessment = await eecpService.getEncounterAssessment(
      req.user.hospitalId,
      req.params.encounterId
    );
    return successResponse(res, 'EECP assessment retrieved successfully', assessment);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const upsertAssessment = async (req, res, next) => {
  try {
    const assessment = await eecpService.upsertAssessment(
      req.user.hospitalId,
      req.params.encounterId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'EECP assessment saved successfully', assessment);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

// --- Course Handlers ---

export const listCourses = async (req, res, next) => {
  try {
    const courses = await eecpService.getCourses(req.user.hospitalId, req.query);
    return successResponse(res, 'Treatment courses retrieved successfully', courses);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getCourse = async (req, res, next) => {
  try {
    const course = await eecpService.getCourseById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Treatment course retrieved successfully', course);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const createCourse = async (req, res, next) => {
  try {
    const course = await eecpService.createCourse(req.user.hospitalId, req.body, req.user.id);
    return successResponse(res, 'Treatment course created successfully', course, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateCourse = async (req, res, next) => {
  try {
    const course = await eecpService.updateCourse(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Treatment course updated successfully', course);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateCourseStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const course = await eecpService.updateCourseStatus(
      req.user.hospitalId,
      req.params.id,
      status,
      notes,
      req.user.id
    );
    return successResponse(res, `Course status updated to ${status}`, course);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getCourseProgress = async (req, res, next) => {
  try {
    const progress = await eecpService.getCourseProgress(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Course progress retrieved successfully', progress);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

// --- Session Handlers ---

export const listCourseSessions = async (req, res, next) => {
  try {
    const sessions = await eecpService.getCourseSessions(req.user.hospitalId, req.params.courseId);
    return successResponse(res, 'Course sessions retrieved successfully', sessions);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const listTodaySessions = async (req, res, next) => {
  try {
    const sessions = await eecpService.getTodaySessions(req.user.hospitalId, req.query);
    return successResponse(res, "Today's sessions retrieved successfully", sessions);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getSession = async (req, res, next) => {
  try {
    const session = await eecpService.getSessionById(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Session details retrieved successfully', session);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const scheduleSession = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    if (!courseId) {
      return errorResponse(res, 'Course ID is required', 400);
    }
    const session = await eecpService.scheduleSession(
      req.user.hospitalId,
      courseId,
      req.body,
      req.user.id
    );
    return successResponse(res, 'EECP session scheduled successfully', session, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const updateSessionStatus = async (req, res, next) => {
  try {
    const session = await eecpService.updateSessionStatus(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, `Session status updated to ${session.status}`, session);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const recordPreAssessment = async (req, res, next) => {
  try {
    const session = await eecpService.recordPreAssessment(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Pre-session assessment recorded successfully', session);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const result = await eecpService.deleteSession(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Session deleted successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

// --- Telemetric Reading Handlers ---

export const listSessionReadings = async (req, res, next) => {
  try {
    const readings = await eecpService.getSessionReadings(req.user.hospitalId, req.params.id);
    return successResponse(res, 'Session readings retrieved successfully', readings);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const addSessionReading = async (req, res, next) => {
  try {
    const reading = await eecpService.addSessionReading(
      req.user.hospitalId,
      req.params.id,
      req.body,
      req.user.id
    );
    return successResponse(res, 'Session reading recorded successfully', reading, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

// --- Dashboard Metrics ---

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await eecpService.getEecpDashboardMetrics(req.user.hospitalId);
    return successResponse(res, 'EECP dashboard metrics retrieved successfully', metrics);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  getEncounterAssessment,
  upsertAssessment,
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  updateCourseStatus,
  getCourseProgress,
  listCourseSessions,
  listTodaySessions,
  getSession,
  scheduleSession,
  updateSessionStatus,
  recordPreAssessment,
  deleteSession,
  listSessionReadings,
  addSessionReading,
  getDashboardMetrics,
};
