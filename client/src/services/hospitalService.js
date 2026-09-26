import api from './api';

/**
 * Fetch paginated, searchable, and filterable list of hospitals
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.search]
 * @param {string} [params.status]
 */
export const getHospitals = async (params = {}) => {
  const query = {};
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  if (params.search && params.search.trim()) query.search = params.search.trim();
  if (params.status && params.status !== 'ALL') query.status = params.status;

  const response = await api.get('/hospitals', { params: query });
  return response.data?.data;
};

/**
 * Fetch detailed hospital record by ID (including settings)
 * @param {string} id
 */
export const getHospitalById = async (id) => {
  const response = await api.get(`/hospitals/${id}`);
  return response.data?.data;
};

/**
 * Create a new hospital tenant
 * @param {Object} data
 */
export const createHospital = async (data) => {
  const response = await api.post('/hospitals', data);
  return response.data?.data;
};

/**
 * Update mutable hospital fields (whitelisted)
 * @param {string} id
 * @param {Object} data
 */
export const updateHospital = async (id, data) => {
  const response = await api.patch(`/hospitals/${id}`, data);
  return response.data?.data;
};

/**
 * Transition hospital status (ACTIVE <-> INACTIVE)
 * @param {string} id
 * @param {'ACTIVE'|'INACTIVE'} status
 */
export const updateHospitalStatus = async (id, status) => {
  const response = await api.patch(`/hospitals/${id}/status`, { status });
  return response.data?.data;
};

/**
 * Fetch all staff/admin users belonging to a specific hospital
 * @param {string} hospitalId
 */
export const getHospitalUsers = async (hospitalId) => {
  const response = await api.get(`/hospitals/${hospitalId}/users`);
  return response.data?.data;
};

/**
 * Create a new user/staff member under a specific hospital tenant
 * @param {string} hospitalId
 * @param {Object} userData - { name, email, password, role }
 */
export const createHospitalUser = async (hospitalId, userData) => {
  const response = await api.post(`/hospitals/${hospitalId}/users`, userData);
  return response.data?.data;
};

/**
 * Update tenant settings and module configuration flags
 * @param {string} hospitalId
 * @param {Array|Object} settings
 */
export const updateHospitalSettings = async (hospitalId, settings) => {
  const response = await api.put(`/hospitals/${hospitalId}/settings`, { settings });
  return response.data?.data;
};

export default {
  getHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  updateHospitalStatus,
  getHospitalUsers,
  createHospitalUser,
  updateHospitalSettings,
};
