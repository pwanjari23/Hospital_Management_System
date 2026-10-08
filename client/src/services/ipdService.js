import api from './api';

export const ipdService = {
  // 1. Dashboard & Bed Board
  getDashboardMetrics: async () => {
    const response = await api.get('/ipd/dashboard');
    return response.data;
  },

  getBedBoard: async (params = {}) => {
    const response = await api.get('/ipd/bed-board', { params });
    return response.data;
  },

  // 2. Wards
  getWards: async (params = {}) => {
    const response = await api.get('/ipd/wards', { params });
    return response.data;
  },

  getWardById: async (wardId) => {
    const response = await api.get(`/ipd/wards/${wardId}`);
    return response.data;
  },

  createWard: async (wardData) => {
    const response = await api.post('/ipd/wards', wardData);
    return response.data;
  },

  updateWard: async (wardId, wardData) => {
    const response = await api.patch(`/ipd/wards/${wardId}`, wardData);
    return response.data;
  },

  // 3. Beds
  getBeds: async (params = {}) => {
    const response = await api.get('/ipd/beds', { params });
    return response.data;
  },

  getBedById: async (bedId) => {
    const response = await api.get(`/ipd/beds/${bedId}`);
    return response.data;
  },

  createBed: async (bedData) => {
    const response = await api.post('/ipd/beds', bedData);
    return response.data;
  },

  updateBed: async (bedId, bedData) => {
    const response = await api.patch(`/ipd/beds/${bedId}`, bedData);
    return response.data;
  },

  updateBedStatus: async (bedId, statusData) => {
    const response = await api.patch(`/ipd/beds/${bedId}/status`, statusData);
    return response.data;
  },

  // 4. IPD Admissions
  getAdmissions: async (params = {}) => {
    const response = await api.get('/ipd/admissions', { params });
    return response.data;
  },

  getAdmissionById: async (admissionId) => {
    const response = await api.get(`/ipd/admissions/${admissionId}`);
    return response.data;
  },

  createAdmission: async (admissionData) => {
    const response = await api.post('/ipd/admissions', admissionData);
    return response.data;
  },

  cancelAdmission: async (admissionId, cancelData) => {
    const response = await api.post(`/ipd/admissions/${admissionId}/cancel`, cancelData);
    return response.data;
  },

  // 5. Bed Transfers
  transferBed: async (admissionId, transferData) => {
    const response = await api.post(`/ipd/admissions/${admissionId}/transfer`, transferData);
    return response.data;
  },

  getAdmissionTransfers: async (admissionId) => {
    const response = await api.get(`/ipd/admissions/${admissionId}/transfers`);
    return response.data;
  },

  // 6. Patient IPD History
  getPatientAdmissions: async (patientId) => {
    const response = await api.get(`/ipd/patients/${patientId}/admissions`);
    return response.data;
  },

  // 7. Phase 9B: Inpatient Vitals
  getAdmissionVitals: async (admissionId) => {
    const response = await api.get(`/ipd/admissions/${admissionId}/vitals`);
    return response.data;
  },

  createInpatientVital: async (admissionId, vitalData) => {
    const response = await api.post(`/ipd/admissions/${admissionId}/vitals`, vitalData);
    return response.data;
  },

  // 8. Phase 9B: Doctor Progress Notes (SOAP)
  getProgressNotes: async (admissionId) => {
    const response = await api.get(`/ipd/admissions/${admissionId}/progress`);
    return response.data;
  },

  getProgressNoteById: async (noteId) => {
    const response = await api.get(`/ipd/progress/${noteId}`);
    return response.data;
  },

  createProgressNote: async (admissionId, noteData) => {
    const response = await api.post(`/ipd/admissions/${admissionId}/progress`, noteData);
    return response.data;
  },

  updateProgressNote: async (noteId, noteData) => {
    const response = await api.put(`/ipd/progress/${noteId}`, noteData);
    return response.data;
  },

  finalizeProgressNote: async (noteId) => {
    const response = await api.patch(`/ipd/progress/${noteId}/finalize`);
    return response.data;
  },

  // 9. Phase 9B: Nursing Daily Notes
  getNursingNotes: async (admissionId) => {
    const response = await api.get(`/ipd/admissions/${admissionId}/nursing-notes`);
    return response.data;
  },

  getNursingNoteById: async (noteId) => {
    const response = await api.get(`/ipd/nursing-notes/${noteId}`);
    return response.data;
  },

  createNursingNote: async (admissionId, noteData) => {
    const response = await api.post(`/ipd/admissions/${admissionId}/nursing-notes`, noteData);
    return response.data;
  },

  updateNursingNote: async (noteId, noteData) => {
    const response = await api.put(`/ipd/nursing-notes/${noteId}`, noteData);
    return response.data;
  },

  finalizeNursingNote: async (noteId) => {
    const response = await api.patch(`/ipd/nursing-notes/${noteId}/finalize`);
    return response.data;
  },

  // 10. Phase 9B: Clinical Context (Prescriptions & Investigations)
  getAdmissionPrescriptions: async (admissionId) => {
    const response = await api.get(`/ipd/admissions/${admissionId}/prescriptions`);
    return response.data;
  },

  getAdmissionInvestigations: async (admissionId) => {
    const response = await api.get(`/ipd/admissions/${admissionId}/investigations`);
    return response.data;
  },

  // 11. Phase 9B: Unified Chronological Timeline
  getAdmissionTimeline: async (admissionId) => {
    const response = await api.get(`/ipd/admissions/${admissionId}/timeline`);
    return response.data;
  },

  // 12. Phase 9B: Discharge Summary & Execution
  getDischargeSummary: async (admissionId) => {
    const response = await api.get(`/ipd/admissions/${admissionId}/discharge-summary`);
    return response.data;
  },

  createOrUpdateDischargeSummary: async (admissionId, summaryData) => {
    const response = await api.post(`/ipd/admissions/${admissionId}/discharge-summary`, summaryData);
    return response.data;
  },

  finalizeDischarge: async (admissionId, dischargeData = {}) => {
    const response = await api.post(`/ipd/admissions/${admissionId}/discharge`, dischargeData);
    return response.data;
  },
};

export default ipdService;
