import api from './api';

export const laboratoryService = {
  // Get aggregated dashboard metrics
  getDashboardMetrics: async () => {
    const response = await api.get('/laboratory/dashboard/metrics');
    return response.data;
  },

  // Get laboratory queue of finalized investigation orders
  getLaboratoryQueue: async (params = {}) => {
    const response = await api.get('/laboratory/orders', { params });
    return response.data;
  },

  // Get single investigation order workspace details
  getOrderDetails: async (orderId) => {
    const response = await api.get(`/laboratory/orders/${orderId}`);
    return response.data;
  },

  // Record sample collection for an order
  createOrCollectSample: async (orderId, sampleData) => {
    const response = await api.post(`/laboratory/orders/${orderId}/sample`, sampleData);
    return response.data;
  },

  // Update sample status (receive, reject, process, complete)
  updateSampleStatus: async (sampleId, sampleData) => {
    const response = await api.patch(`/laboratory/samples/${sampleId}`, sampleData);
    return response.data;
  },

  // Save or submit result entry
  saveResult: async (orderId, resultData) => {
    const response = await api.post(`/laboratory/orders/${orderId}/result`, resultData);
    return response.data;
  },

  // Verify result
  verifyResult: async (resultId, notes = '') => {
    const response = await api.post(`/laboratory/results/${resultId}/verify`, { notes });
    return response.data;
  },

  // Finalize result (locks as immutable clinical document)
  finalizeResult: async (resultId, notes = '') => {
    const response = await api.post(`/laboratory/results/${resultId}/finalize`, { notes });
    return response.data;
  },

  // Get result details by ID
  getResultById: async (resultId) => {
    const response = await api.get(`/laboratory/results/${resultId}`);
    return response.data;
  },

  // Get finalized results for clinical encounter
  getEncounterResults: async (encounterId) => {
    const response = await api.get(`/laboratory/encounters/${encounterId}/results`);
    return response.data;
  },

  // Get patient investigation history
  getPatientInvestigationHistory: async (patientId) => {
    const response = await api.get(`/laboratory/patients/${patientId}/results`);
    return response.data;
  },
};

export default laboratoryService;
