import api from './api';

export const doctorScheduleService = {
  // Schedules
  getSchedules: async (params = {}) => {
    const response = await api.get('/doctor-schedules', { params });
    return response.data;
  },

  getScheduleById: async (id) => {
    const response = await api.get(`/doctor-schedules/${id}`);
    return response.data;
  },

  getSchedulesByDoctorId: async (doctorId) => {
    const response = await api.get(`/doctor-schedules/doctor/${doctorId}`);
    return response.data;
  },

  createSchedule: async (data) => {
    const response = await api.post('/doctor-schedules', data);
    return response.data;
  },

  updateSchedule: async (id, data) => {
    const response = await api.put(`/doctor-schedules/${id}`, data);
    return response.data;
  },

  toggleScheduleStatus: async (id) => {
    const response = await api.patch(`/doctor-schedules/${id}/status`);
    return response.data;
  },

  deleteSchedule: async (id) => {
    const response = await api.delete(`/doctor-schedules/${id}`);
    return response.data;
  },

  // Leaves
  getLeaves: async (params = {}) => {
    const response = await api.get('/doctor-leaves', { params });
    return response.data;
  },

  getLeaveById: async (id) => {
    const response = await api.get(`/doctor-leaves/${id}`);
    return response.data;
  },

  createLeave: async (data) => {
    const response = await api.post('/doctor-leaves', data);
    return response.data;
  },

  updateLeave: async (id, data) => {
    const response = await api.put(`/doctor-leaves/${id}`, data);
    return response.data;
  },

  toggleLeaveStatus: async (id) => {
    const response = await api.patch(`/doctor-leaves/${id}/status`);
    return response.data;
  },

  deleteLeave: async (id) => {
    const response = await api.delete(`/doctor-leaves/${id}`);
    return response.data;
  },
};

export default doctorScheduleService;
