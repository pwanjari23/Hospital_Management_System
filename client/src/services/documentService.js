import api from './api';

export const getDocument = async (type, id) => {
  const response = await api.get(`/documents/${type}/${id}`);
  return response.data;
};

export const getBranding = async () => {
  const response = await api.get('/documents/branding');
  return response.data;
};

export const updateBranding = async (brandingData) => {
  const response = await api.put('/documents/branding', brandingData);
  return response.data;
};

export default {
  getDocument,
  getBranding,
  updateBranding,
};
