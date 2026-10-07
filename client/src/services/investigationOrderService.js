import api from './api';

export const investigationOrderService = {
  // Get all investigation orders for an encounter
  getEncounterOrders: async (encounterId) => {
    const response = await api.get(`/encounters/${encounterId}/investigation-orders`);
    return response.data;
  },

  // Get order by ID
  getOrderById: async (id) => {
    const response = await api.get(`/investigation-orders/${id}`);
    return response.data;
  },

  // Create order or batch orders
  createOrder: async (encounterId, orderData) => {
    const response = await api.post(`/encounters/${encounterId}/investigation-orders`, orderData);
    return response.data;
  },

  // Update order
  updateOrder: async (id, updateData) => {
    const response = await api.put(`/investigation-orders/${id}`, updateData);
    return response.data;
  },

  // Finalize order
  finalizeOrder: async (id) => {
    const response = await api.patch(`/investigation-orders/${id}/finalize`);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (id, cancellationReason) => {
    const response = await api.patch(`/investigation-orders/${id}/cancel`, { cancellationReason });
    return response.data;
  },

  // Delete order
  deleteOrder: async (id) => {
    const response = await api.delete(`/investigation-orders/${id}`);
    return response.data;
  },
};

export default investigationOrderService;
