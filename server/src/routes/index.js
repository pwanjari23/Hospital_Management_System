import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import hospitalRoutes from './hospital.routes.js';
import superAdminRoutes from './superAdmin.routes.js';
import patientRoutes from './patient.routes.js';
import hospitalAdminRoutes from './hospitalAdmin.routes.js';
import departmentRoutes from './department.routes.js';
import staffRoutes from './staff.routes.js';
import clinicalMasterRoutes from './clinicalMaster.routes.js';
import appointmentRoutes from './appointment.routes.js';
import doctorScheduleRoutes from './doctorSchedule.routes.js';
import doctorLeaveRoutes from './doctorLeave.routes.js';
import encounterRoutes from './encounter.routes.js';
import prescriptionRoutes from './prescription.routes.js';
import investigationOrderRoutes from './investigationOrder.routes.js';
import eecpRoutes from './eecp.routes.js';
import pharmacyRoutes from './pharmacy.routes.js';
import laboratoryRoutes from './laboratory.routes.js';
import billingRoutes from './billing.routes.js';
import ipdRoutes from './ipd.routes.js';
import reportRoutes from './report.routes.js';
import notificationRoutes from './notification.routes.js';
import documentRoutes from './document.routes.js';

const apiRouter = Router();


// Foundational health check
apiRouter.use('/health', healthRoutes);

// Authentication endpoints
apiRouter.use('/auth', authRoutes);

// Platform Hospital/Tenant Management (Super Admin)
apiRouter.use('/hospitals', hospitalRoutes);

// Super Admin platform metrics
apiRouter.use('/super-admin', superAdminRoutes);

// Patient Management (Module 4)
apiRouter.use('/patients', patientRoutes);

// Hospital Admin Tenant Portal, Dashboard & Settings
apiRouter.use('/hospital-admin', hospitalAdminRoutes);

// Department Management (Phase 5 - Module 1)
apiRouter.use('/departments', departmentRoutes);

// Doctors & Staff Management (Phase 5 - Module 2)
apiRouter.use('/staff', staffRoutes);

// Clinical Masters (Phase 5 - Module 3)
apiRouter.use('/clinical-masters', clinicalMasterRoutes);

// Phase 6: Appointments, Doctor Rostering & Slot Management
apiRouter.use('/appointments', appointmentRoutes);
apiRouter.use('/doctor-schedules', doctorScheduleRoutes);
apiRouter.use('/doctor-leaves', doctorLeaveRoutes);

// Phase 7A: Clinical Encounters, Vitals & Doctor Consultation
apiRouter.use('/encounters', encounterRoutes);

// Phase 7B: Prescriptions & Investigation Orders
apiRouter.use('/prescriptions', prescriptionRoutes);
apiRouter.use('/investigation-orders', investigationOrderRoutes);

// Phase 7C: EECP Clinical Workflow
apiRouter.use('/eecp', eecpRoutes);

// Phase 8A: Pharmacy Inventory & Prescription Dispensing
apiRouter.use('/pharmacy', pharmacyRoutes);

// Phase 8B: Laboratory & Investigation Results
apiRouter.use('/laboratory', laboratoryRoutes);

// Phase 8C: Billing, Payments & Receipts
apiRouter.use('/billing', billingRoutes);

// Phase 9A: IPD Admission, Ward & Bed Management
apiRouter.use('/ipd', ipdRoutes);

// Phase 10: Central Reports & Analytics
apiRouter.use('/reports', reportRoutes);

// Phase 11: Notifications, Documents, Printing & Hospital Branding
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/documents', documentRoutes);

export default apiRouter;




