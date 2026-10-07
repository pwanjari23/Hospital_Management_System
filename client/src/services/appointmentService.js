import api from './api';

export const appointmentService = {
  // Get available slots for doctor on date
  getSlots: async (doctorId, date) => {
    const response = await api.get('/appointments/slots', {
      params: { doctorId, date },
    });
    return response.data;
  },

  // Get appointment statistics
  getStats: async (date) => {
    const response = await api.get('/appointments/stats', {
      params: { date },
    });
    return response.data;
  },

  // List appointments with query filters
  getAppointments: async (params = {}) => {
    const response = await api.get('/appointments', { params });
    return response.data;
  },

  // Get appointment details
  getAppointmentById: async (id) => {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },

  // Book new appointment
  bookAppointment: async (appointmentData) => {
    const response = await api.post('/appointments', appointmentData);
    return response.data;
  },

  // Update appointment details
  updateAppointment: async (id, updateData) => {
    const response = await api.put(`/appointments/${id}`, updateData);
    return response.data;
  },

  // Update appointment lifecycle status
  updateStatus: async (id, statusData) => {
    const response = await api.patch(`/appointments/${id}/status`, statusData);
    return response.data;
  },

  // Reschedule appointment
  rescheduleAppointment: async (id, rescheduleData) => {
    const response = await api.patch(`/appointments/${id}/reschedule`, rescheduleData);
    return response.data;
  },

  // Cancel appointment
  cancelAppointment: async (id, cancelData) => {
    const response = await api.patch(`/appointments/${id}/cancel`, cancelData);
    return response.data;
  },
};

export default appointmentService;
