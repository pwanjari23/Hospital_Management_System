import api from './api';

/**
 * Service for Hospital Admin tenant dashboard & hospital operations
 */
export const hospitalAdminService = {
  /**
   * Fetch authenticated hospital dashboard statistics and hospital branding
   */
  async getDashboard() {
    const response = await api.get('/hospital-admin/dashboard');
    return response.data;
  },
};

export default hospitalAdminService;
