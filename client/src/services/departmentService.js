import api from './api';

export const departmentService = {
  /**
   * Fetch paginated departments for the authenticated hospital tenant
   */
  async getDepartments(params = {}) {
    const response = await api.get('/departments', { params });
    return response.data;
  },

  /**
   * Fetch single department details by ID
   */
  async getDepartment(id) {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  /**
   * Create a new department
   */
  async createDepartment(data) {
    const response = await api.post('/departments', data);
    return response.data;
  },

  /**
   * Update an existing department
   */
  async updateDepartment(id, data) {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  },

  /**
   * Toggle department active/inactive status
   */
  async updateDepartmentStatus(id, status) {
    const response = await api.patch(`/departments/${id}/status`, { status });
    return response.data;
  },
};

export default departmentService;
