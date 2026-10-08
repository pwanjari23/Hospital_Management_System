import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import reportController from '../controllers/report.controller.js';
import { validateReportQuery } from '../validators/report.validator.js';

const router = Router();

// All reporting routes require authentication
router.use(authenticate);

// 1. Central Analytics Dashboard
router.get(
  '/dashboard',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  validateReportQuery,
  reportController.getDashboardMetrics
);

// 2. Patient Registration & Visits Report
router.get(
  '/patients',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'),
  validateReportQuery,
  reportController.getPatientReport
);

// 3. Appointment Reports
router.get(
  '/appointments',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'),
  validateReportQuery,
  reportController.getAppointmentReport
);

// 4. OPD Clinical Consultations Report
router.get(
  '/opd',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR'),
  validateReportQuery,
  reportController.getOpdReport
);

// 5. Doctor Operational Performance
router.get(
  '/doctors',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR'),
  validateReportQuery,
  reportController.getDoctorPerformanceReport
);

// 6. Department Activity Report
router.get(
  '/departments',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR'),
  validateReportQuery,
  reportController.getDepartmentReport
);

// 7. IPD Inpatient Analytics & Bed Occupancy Report
router.get(
  '/ipd',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  validateReportQuery,
  reportController.getIpdReport
);

// 8. Pharmacy Inventory & Dispensing Report
router.get(
  '/pharmacy',
  requireRole('HOSPITAL_ADMIN', 'PHARMACIST'),
  validateReportQuery,
  reportController.getPharmacyReport
);

// 9. Laboratory Diagnostics Report
router.get(
  '/laboratory',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'LAB_STAFF'),
  validateReportQuery,
  reportController.getLaboratoryReport
);

// 10. EECP Therapy Clinical Report
router.get(
  '/eecp',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR'),
  validateReportQuery,
  reportController.getEecpReport
);

// 11. Billing, Finance & Revenue Report (Restricted to HOSPITAL_ADMIN)
router.get(
  '/billing',
  requireRole('HOSPITAL_ADMIN'),
  validateReportQuery,
  reportController.getBillingReport
);

// 12. CSV Export for supported reports
router.get(
  '/:reportType/export',
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'),
  reportController.exportReportCsv
);

export default router;
