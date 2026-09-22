import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const apiRouter = Router();

// Mount foundational health check
apiRouter.use('/health', healthRoutes);

// Mount authentication routes
apiRouter.use('/auth', authRoutes);

export default apiRouter;
