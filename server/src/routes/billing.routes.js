import { Router } from 'express';
import {
  authenticate,
  requireRole,
  requireHospitalTenant,
} from '../middleware/auth.middleware.js';
import {
  getDashboardMetrics,
  getBillingServices,
  createBillingService,
  updateBillingService,
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  collectPayment,
  getPaymentById,
  refundPayment,
  getReceiptById,
  getPatientFinancialHistory,
  getUnbilledItemsForPatient,
} from '../controllers/billing.controller.js';
import {
  validateCreateService,
  validateUpdateService,
  validateCreateInvoice,
  validateUpdateInvoice,
  validateCancelInvoice,
  validateCollectPayment,
  validateRefundPayment,
} from '../validators/billing.validator.js';

const router = Router();

// Base middleware: all billing routes require authentication and tenant hospital scope
router.use(authenticate);
router.use(requireHospitalTenant);

// RBAC Role Definitions
const BILLING_ADMIN_ROLES = ['HOSPITAL_ADMIN'];
const BILLING_STAFF_ROLES = ['HOSPITAL_ADMIN', 'RECEPTIONIST'];
const BILLING_VIEW_ROLES = [
  'HOSPITAL_ADMIN',
  'RECEPTIONIST',
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
  'LAB_STAFF',
];

// 1. Dashboard Metrics
router.get('/dashboard', requireRole(BILLING_STAFF_ROLES), getDashboardMetrics);

// 2. Billing Services Catalog
router.get('/services', requireRole(BILLING_VIEW_ROLES), getBillingServices);
router.post(
  '/services',
  requireRole(BILLING_ADMIN_ROLES),
  validateCreateService,
  createBillingService
);
router.patch(
  '/services/:id',
  requireRole(BILLING_ADMIN_ROLES),
  validateUpdateService,
  updateBillingService
);

// 3. Invoices
router.get('/invoices', requireRole(BILLING_VIEW_ROLES), getInvoices);
router.post(
  '/invoices',
  requireRole(BILLING_STAFF_ROLES),
  validateCreateInvoice,
  createInvoice
);
router.get('/invoices/:id', requireRole(BILLING_VIEW_ROLES), getInvoiceById);
router.patch(
  '/invoices/:id',
  requireRole(BILLING_STAFF_ROLES),
  validateUpdateInvoice,
  updateInvoice
);
router.post(
  '/invoices/:id/issue',
  requireRole(BILLING_STAFF_ROLES),
  issueInvoice
);
router.post(
  '/invoices/:id/cancel',
  requireRole(BILLING_ADMIN_ROLES),
  validateCancelInvoice,
  cancelInvoice
);

// 4. Payments & Receipts
router.post(
  '/invoices/:id/payments',
  requireRole(BILLING_STAFF_ROLES),
  validateCollectPayment,
  collectPayment
);
router.get('/payments/:id', requireRole(BILLING_VIEW_ROLES), getPaymentById);
router.post(
  '/payments/:id/refund',
  requireRole(BILLING_ADMIN_ROLES),
  validateRefundPayment,
  refundPayment
);
router.get('/receipts/:id', requireRole(BILLING_VIEW_ROLES), getReceiptById);

// 5. Patient Financial History & Unbilled Items
router.get(
  '/patients/:patientId/financial-history',
  requireRole(BILLING_VIEW_ROLES),
  getPatientFinancialHistory
);
router.get(
  '/patients/:patientId/unbilled-items',
  requireRole(BILLING_STAFF_ROLES),
  getUnbilledItemsForPatient
);

export default router;
