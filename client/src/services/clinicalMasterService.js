import api from './api';

export const clinicalMasterService = {
  // 1. Medicines
  async getMedicines(params = {}) {
    const response = await api.get('/clinical-masters/medicines', { params });
    return response.data;
  },
  async createMedicine(data) {
    const response = await api.post('/clinical-masters/medicines', data);
    return response.data;
  },
  async updateMedicine(id, data) {
    const response = await api.patch(`/clinical-masters/medicines/${id}`, data);
    return response.data;
  },
  async updateMedicineStatus(id, status) {
    const response = await api.patch(`/clinical-masters/medicines/${id}/status`, { status });
    return response.data;
  },

  // 2. Investigations
  async getInvestigations(params = {}) {
    const response = await api.get('/clinical-masters/investigations', { params });
    return response.data;
  },
  async createInvestigation(data) {
    const response = await api.post('/clinical-masters/investigations', data);
    return response.data;
  },
  async updateInvestigation(id, data) {
    const response = await api.patch(`/clinical-masters/investigations/${id}`, data);
    return response.data;
  },
  async updateInvestigationStatus(id, status) {
    const response = await api.patch(`/clinical-masters/investigations/${id}/status`, { status });
    return response.data;
  },

  // 3. Treatments
  async getTreatments(params = {}) {
    const response = await api.get('/clinical-masters/treatments', { params });
    return response.data;
  },
  async createTreatment(data) {
    const response = await api.post('/clinical-masters/treatments', data);
    return response.data;
  },
  async updateTreatment(id, data) {
    const response = await api.patch(`/clinical-masters/treatments/${id}`, data);
    return response.data;
  },
  async updateTreatmentStatus(id, status) {
    const response = await api.patch(`/clinical-masters/treatments/${id}/status`, { status });
    return response.data;
  },

  // 4. EECP Packages
  async getEecpPackages(params = {}) {
    const response = await api.get('/clinical-masters/eecp-packages', { params });
    return response.data;
  },
  async createEecpPackage(data) {
    const response = await api.post('/clinical-masters/eecp-packages', data);
    return response.data;
  },
  async updateEecpPackage(id, data) {
    const response = await api.patch(`/clinical-masters/eecp-packages/${id}`, data);
    return response.data;
  },
  async updateEecpPackageStatus(id, status) {
    const response = await api.patch(`/clinical-masters/eecp-packages/${id}/status`, { status });
    return response.data;
  },

  // 5. Payment Modes
  async getPaymentModes(params = {}) {
    const response = await api.get('/clinical-masters/payment-modes', { params });
    return response.data;
  },
  async createPaymentMode(data) {
    const response = await api.post('/clinical-masters/payment-modes', data);
    return response.data;
  },
  async updatePaymentMode(id, data) {
    const response = await api.patch(`/clinical-masters/payment-modes/${id}`, data);
    return response.data;
  },
  async updatePaymentModeStatus(id, status) {
    const response = await api.patch(`/clinical-masters/payment-modes/${id}/status`, { status });
    return response.data;
  },
};

export default clinicalMasterService;
