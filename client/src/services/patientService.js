import api from './api';

/**
 * Service for tenant-scoped Patient Management operations
 */
export const patientService = {
  /**
   * Fetch paginated list of patients with search and filters
   * @param {Object} params
   * @param {string} [params.search] - Search by UHID, firstName, lastName, phone, email
   * @param {string} [params.gender] - MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY
   * @param {string} [params.bloodGroup] - Blood group enum
   * @param {string} [params.status] - 'active' | 'inactive' | 'all'
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {string} [params.sortBy='createdAt']
   * @param {string} [params.sortOrder='DESC']
   */
  async getPatients(params = {}) {
    const response = await api.get('/patients', { params });
    return response.data;
  },

  /**
   * Fetch single patient details by UUID
   * @param {string} id
   */
  async getPatient(id) {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },

  /**
   * Register a new patient in the authenticated hospital tenant
   * @param {Object} data
   */
  async createPatient(data) {
    const response = await api.post('/patients', data);
    return response.data;
  },

  /**
   * Update existing patient information
   * @param {string} id
   * @param {Object} data
   */
  async updatePatient(id, data) {
    const response = await api.patch(`/patients/${id}`, data);
    return response.data;
  },

  /**
   * Toggle patient active/inactive status
   * @param {string} id
   * @param {boolean} isActive
   */
  async updatePatientStatus(id, isActive) {
    const response = await api.patch(`/patients/${id}/status`, { isActive });
    return response.data;
  },
};

export default patientService;
