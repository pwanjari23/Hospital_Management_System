import api from './api';

export const settingsService = {
  /**
   * Fetch hospital profile and all configuration settings
   */
  async getSettings() {
    const response = await api.get('/hospital-admin/settings');
    return response.data;
  },

  /**
   * Update hospital organization profile
   */
  async updateProfile(data) {
    const response = await api.patch('/hospital-admin/settings/profile', data);
    return response.data;
  },

  /**
   * Update patient numbering & UHID prefix configuration
   */
  async updatePatientConfig(data) {
    const response = await api.put('/hospital-admin/settings/patient-config', data);
    return response.data;
  },

  /**
   * Update billing configuration
   */
  async updateBillingConfig(data) {
    const response = await api.put('/hospital-admin/settings/billing-config', data);
    return response.data;
  },

  /**
   * Update notification settings
   */
  async updateNotificationConfig(data) {
    const response = await api.put('/hospital-admin/settings/notification-config', data);
    return response.data;
  },
};

export default settingsService;
