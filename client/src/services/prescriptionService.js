import api from './api';

export const prescriptionService = {
  // Get all prescriptions for an encounter
  getEncounterPrescriptions: async (encounterId) => {
    const response = await api.get(`/encounters/${encounterId}/prescriptions`);
    return response.data;
  },

  // Get prescription by ID
  getPrescriptionById: async (id) => {
    const response = await api.get(`/prescriptions/${id}`);
    return response.data;
  },

  // Create prescription (can include initial items)
  createPrescription: async (encounterId, prescriptionData) => {
    const response = await api.post(`/encounters/${encounterId}/prescriptions`, prescriptionData);
    return response.data;
  },

  // Update prescription metadata
  updatePrescription: async (id, updateData) => {
    const response = await api.put(`/prescriptions/${id}`, updateData);
    return response.data;
  },

  // Finalize prescription
  finalizePrescription: async (id) => {
    const response = await api.patch(`/prescriptions/${id}/finalize`);
    return response.data;
  },

  // Cancel prescription
  cancelPrescription: async (id, cancellationReason) => {
    const response = await api.patch(`/prescriptions/${id}/cancel`, { cancellationReason });
    return response.data;
  },

  // Add item to prescription
  addItem: async (prescriptionId, itemData) => {
    const response = await api.post(`/prescriptions/${prescriptionId}/items`, itemData);
    return response.data;
  },

  // Update item
  updateItem: async (prescriptionId, itemId, itemData) => {
    const response = await api.put(`/prescriptions/${prescriptionId}/items/${itemId}`, itemData);
    return response.data;
  },

  // Delete item
  deleteItem: async (prescriptionId, itemId) => {
    const response = await api.delete(`/prescriptions/${prescriptionId}/items/${itemId}`);
    return response.data;
  },
};

export default prescriptionService;
