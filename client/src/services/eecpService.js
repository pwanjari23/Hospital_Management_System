import api from './api';

export const eecpService = {
  // Assessment
  getEncounterAssessment: async (encounterId) => {
    const response = await api.get(`/encounters/${encounterId}/eecp-assessment`);
    return response.data;
  },

  saveEncounterAssessment: async (encounterId, data) => {
    const response = await api.post(`/encounters/${encounterId}/eecp-assessment`, data);
    return response.data;
  },

  // Operational Dashboard
  getDashboardMetrics: async () => {
    const response = await api.get('/eecp/dashboard-metrics');
    return response.data;
  },

  getTodaySessions: async (params) => {
    const response = await api.get('/eecp/sessions/today', { params });
    return response.data;
  },

  // Courses
  getCourses: async (params) => {
    const response = await api.get('/eecp/courses', { params });
    return response.data;
  },

  getCourseById: async (id) => {
    const response = await api.get(`/eecp/courses/${id}`);
    return response.data;
  },

  createCourse: async (data) => {
    const response = await api.post('/eecp/courses', data);
    return response.data;
  },

  updateCourse: async (id, data) => {
    const response = await api.put(`/eecp/courses/${id}`, data);
    return response.data;
  },

  updateCourseStatus: async (id, status, notes) => {
    const response = await api.patch(`/eecp/courses/${id}/status`, { status, notes });
    return response.data;
  },

  getCourseProgress: async (id) => {
    const response = await api.get(`/eecp/courses/${id}/progress`);
    return response.data;
  },

  getCourseSessions: async (courseId) => {
    const response = await api.get(`/eecp/courses/${courseId}/sessions`);
    return response.data;
  },

  scheduleSession: async (courseId, data) => {
    const response = await api.post(`/eecp/courses/${courseId}/sessions`, data);
    return response.data;
  },

  // Sessions
  getSessionById: async (id) => {
    const response = await api.get(`/eecp/sessions/${id}`);
    return response.data;
  },

  updateSessionStatus: async (id, statusData) => {
    const response = await api.patch(`/eecp/sessions/${id}/status`, statusData);
    return response.data;
  },

  recordPreAssessment: async (id, data) => {
    const response = await api.post(`/eecp/sessions/${id}/pre-assessment`, data);
    return response.data;
  },

  deleteSession: async (id) => {
    const response = await api.delete(`/eecp/sessions/${id}`);
    return response.data;
  },

  // Readings
  getSessionReadings: async (id) => {
    const response = await api.get(`/eecp/sessions/${id}/readings`);
    return response.data;
  },

  addSessionReading: async (id, data) => {
    const response = await api.post(`/eecp/sessions/${id}/readings`, data);
    return response.data;
  },
};

export default eecpService;
