import api from './api';

export const billingService = {
  // 1. Dashboard Metrics
  getDashboardMetrics: async () => {
    const response = await api.get('/billing/dashboard');
    return response.data;
  },

  // 2. Billing Services Catalog
  getServices: async (params = {}) => {
    const response = await api.get('/billing/services', { params });
    return response.data;
  },

  createService: async (serviceData) => {
    const response = await api.post('/billing/services', serviceData);
    return response.data;
  },

  updateService: async (serviceId, serviceData) => {
    const response = await api.patch(`/billing/services/${serviceId}`, serviceData);
    return response.data;
  },

  // 3. Invoices
  getInvoices: async (params = {}) => {
    const response = await api.get('/billing/invoices', { params });
    return response.data;
  },

  createInvoice: async (invoiceData) => {
    const response = await api.post('/billing/invoices', invoiceData);
    return response.data;
  },

  getInvoiceById: async (invoiceId) => {
    const response = await api.get(`/billing/invoices/${invoiceId}`);
    return response.data;
  },

  updateInvoice: async (invoiceId, invoiceData) => {
    const response = await api.patch(`/billing/invoices/${invoiceId}`, invoiceData);
    return response.data;
  },

  issueInvoice: async (invoiceId) => {
    const response = await api.post(`/billing/invoices/${invoiceId}/issue`);
    return response.data;
  },

  cancelInvoice: async (invoiceId, data) => {
    const response = await api.post(`/billing/invoices/${invoiceId}/cancel`, data);
    return response.data;
  },

  // 4. Payments & Receipts
  collectPayment: async (invoiceId, paymentData) => {
    const response = await api.post(`/billing/invoices/${invoiceId}/payments`, paymentData);
    return response.data;
  },

  getPaymentById: async (paymentId) => {
    const response = await api.get(`/billing/payments/${paymentId}`);
    return response.data;
  },

  refundPayment: async (paymentId, refundData) => {
    const response = await api.post(`/billing/payments/${paymentId}/refund`, refundData);
    return response.data;
  },

  getReceiptById: async (receiptId) => {
    const response = await api.get(`/billing/receipts/${receiptId}`);
    return response.data;
  },

  // 5. Patient Financial History & Unbilled Items
  getPatientFinancialHistory: async (patientId) => {
    const response = await api.get(`/billing/patients/${patientId}/financial-history`);
    return response.data;
  },

  getUnbilledItemsForPatient: async (patientId) => {
    const response = await api.get(`/billing/patients/${patientId}/unbilled-items`);
    return response.data;
  },

  // 6. Payment Modes Master (fetch for selection)
  getPaymentModes: async () => {
    const response = await api.get('/clinical-masters/payment-modes');
    return response.data;
  },
};

export default billingService;
