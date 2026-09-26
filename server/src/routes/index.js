import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import hospitalRoutes from './hospital.routes.js';
import superAdminRoutes from './superAdmin.routes.js';

import patientRoutes from './patient.routes.js';
import hospitalAdminRoutes from './hospitalAdmin.routes.js';

const apiRouter = Router();

// Foundational health check
apiRouter.use('/health', healthRoutes);

// Authentication endpoints
apiRouter.use('/auth', authRoutes);

// Platform Hospital/Tenant Management
apiRouter.use('/hospitals', hospitalRoutes);

// Super Admin platform metrics
apiRouter.use('/super-admin', superAdminRoutes);

// Patient Management (Module 4)
apiRouter.use('/patients', patientRoutes);

// Hospital Admin Tenant Portal & Dashboard
apiRouter.use('/hospital-admin', hospitalAdminRoutes);

export default apiRouter;
