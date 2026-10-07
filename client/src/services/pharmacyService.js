import api from './api';

export const pharmacyService = {
  // Get aggregated dashboard metrics
  getDashboardMetrics: async () => {
    const response = await api.get('/pharmacy/dashboard/metrics');
    return response.data;
  },

  // Get inventory batches with filtering and search
  getInventory: async (params = {}) => {
    const response = await api.get('/pharmacy/inventory', { params });
    return response.data;
  },

  // Stock-in physical medicine into a batch
  stockIn: async (batchData) => {
    const response = await api.post('/pharmacy/inventory/stock-in', batchData);
    return response.data;
  },

  // Get batch details by ID
  getBatchById: async (id) => {
    const response = await api.get(`/pharmacy/inventory/${id}`);
    return response.data;
  },

  // Get stock transaction history for a batch
  getBatchTransactions: async (id) => {
    const response = await api.get(`/pharmacy/inventory/${id}/transactions`);
    return response.data;
  },

  // Update batch status (e.g. BLOCKED, ACTIVE)
  updateBatchStatus: async (id, status, reason) => {
    const response = await api.patch(`/pharmacy/inventory/${id}/status`, { status, reason });
    return response.data;
  },

  // Get finalized prescriptions queue waiting for dispensing
  getPrescriptionQueue: async (params = {}) => {
    const response = await api.get('/pharmacy/prescriptions', { params });
    return response.data;
  },

  // Get prescription context and suggested FEFO batch allocation for dispensing
  getPrescriptionForDispensing: async (prescriptionId) => {
    const response = await api.get(`/pharmacy/prescriptions/${prescriptionId}`);
    return response.data;
  },

  // Execute dispensing against a prescription
  dispensePrescription: async (prescriptionId, dispensingData) => {
    const response = await api.post(`/pharmacy/prescriptions/${prescriptionId}/dispense`, dispensingData);
    return response.data;
  },

  // Get single dispensing event details
  getDispensingById: async (id) => {
    const response = await api.get(`/pharmacy/dispensings/${id}`);
    return response.data;
  },

  // Get complete patient medication and dispensing history
  getPatientMedicationHistory: async (patientId) => {
    const response = await api.get(`/pharmacy/patients/${patientId}/medication-history`);
    return response.data;
  },
};

export default pharmacyService;
