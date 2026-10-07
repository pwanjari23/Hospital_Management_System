import api from './api';

export const encounterService = {
  // List encounters with filters & pagination
  getEncounters: async (params = {}) => {
    const response = await api.get('/encounters', { params });
    return response.data;
  },

  // Get encounter details by ID
  getEncounterById: async (id) => {
    const response = await api.get(`/encounters/${id}`);
    return response.data;
  },

  // Create/Start encounter (from checked-in appointment or direct registration)
  createEncounter: async (encounterData) => {
    const response = await api.post('/encounters', encounterData);
    return response.data;
  },

  // Update clinical notes, examination, assessment & plan (Save Draft)
  updateConsultation: async (id, consultationData) => {
    const response = await api.put(`/encounters/${id}/consultation`, consultationData);
    return response.data;
  },

  // Complete consultation
  completeEncounter: async (id, completeData = {}) => {
    const response = await api.patch(`/encounters/${id}/complete`, completeData);
    return response.data;
  },

  // Patient clinical timeline / previous encounters
  getPatientTimeline: async (patientId) => {
    const response = await api.get(`/encounters/patient/${patientId}/timeline`);
    return response.data;
  },

  // Vitals sub-resource
  getVitals: async (encounterId) => {
    const response = await api.get(`/encounters/${encounterId}/vitals`);
    return response.data;
  },

  recordVital: async (encounterId, vitalData) => {
    const response = await api.post(`/encounters/${encounterId}/vitals`, vitalData);
    return response.data;
  },

  // Diagnoses sub-resource
  getDiagnoses: async (encounterId) => {
    const response = await api.get(`/encounters/${encounterId}/diagnoses`);
    return response.data;
  },

  addDiagnosis: async (encounterId, diagnosisData) => {
    const response = await api.post(`/encounters/${encounterId}/diagnoses`, diagnosisData);
    return response.data;
  },

  updateDiagnosis: async (encounterId, diagnosisId, diagnosisData) => {
    const response = await api.put(
      `/encounters/${encounterId}/diagnoses/${diagnosisId}`,
      diagnosisData
    );
    return response.data;
  },

  deleteDiagnosis: async (encounterId, diagnosisId) => {
    const response = await api.delete(
      `/encounters/${encounterId}/diagnoses/${diagnosisId}`
    );
    return response.data;
  },
};

export default encounterService;
