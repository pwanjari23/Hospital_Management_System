import api from './api';

export const reportService = {
  // 1. Central Analytics Dashboard
  getDashboardMetrics: async (params = {}) => {
    const response = await api.get('/reports/dashboard', { params });
    return response.data;
  },

  // 2. Patient Registration & Visits Report
  getPatientReport: async (params = {}) => {
    const response = await api.get('/reports/patients', { params });
    return response.data;
  },

  // 3. Appointment Report
  getAppointmentReport: async (params = {}) => {
    const response = await api.get('/reports/appointments', { params });
    return response.data;
  },

  // 4. OPD Clinical Consultations Report
  getOpdReport: async (params = {}) => {
    const response = await api.get('/reports/opd', { params });
    return response.data;
  },

  // 5. Doctor Operational Performance Report
  getDoctorPerformanceReport: async (params = {}) => {
    const response = await api.get('/reports/doctors', { params });
    return response.data;
  },

  // 6. Department Activity Report
  getDepartmentReport: async (params = {}) => {
    const response = await api.get('/reports/departments', { params });
    return response.data;
  },

  // 7. IPD Inpatient & Bed Occupancy Report
  getIpdReport: async (params = {}) => {
    const response = await api.get('/reports/ipd', { params });
    return response.data;
  },

  // 8. Pharmacy Inventory & Dispensing Report
  getPharmacyReport: async (params = {}) => {
    const response = await api.get('/reports/pharmacy', { params });
    return response.data;
  },

  // 9. Laboratory Diagnostics Report
  getLaboratoryReport: async (params = {}) => {
    const response = await api.get('/reports/laboratory', { params });
    return response.data;
  },

  // 10. EECP Therapy Clinical Report
  getEecpReport: async (params = {}) => {
    const response = await api.get('/reports/eecp', { params });
    return response.data;
  },

  // 11. Billing, Finance & Revenue Report
  getBillingReport: async (params = {}) => {
    const response = await api.get('/reports/billing', { params });
    return response.data;
  },

  // 12. CSV Export
  exportReportCsv: async (reportType, params = {}) => {
    const response = await api.get(`/reports/${reportType}/export`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

export default reportService;
