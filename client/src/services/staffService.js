import api from './api';

export const staffService = {
  /**
   * Fetch paginated list of staff and doctors for current tenant
   */
  async getStaff(params = {}) {
    const response = await api.get('/staff', { params });
    return response.data;
  },

  /**
   * Fetch single staff / doctor profile by ID
   */
  async getStaffById(id) {
    const response = await api.get(`/staff/${id}`);
    return response.data;
  },

  /**
   * Create / provision new staff member or doctor
   */
  async createStaff(data) {
    const response = await api.post('/staff', data);
    return response.data;
  },

  /**
   * Update staff member or doctor details
   */
  async updateStaff(id, data) {
    const response = await api.patch(`/staff/${id}`, data);
    return response.data;
  },

  /**
   * Toggle staff status (ACTIVE <-> INACTIVE)
   */
  async updateStaffStatus(id, status) {
    const response = await api.patch(`/staff/${id}/status`, { status });
    return response.data;
  },
};

export default staffService;
