import { Router } from 'express';
import healthRoutes from './health.routes.js';

const apiRouter = Router();

// Mount foundational health check
apiRouter.use('/health', healthRoutes);

export default apiRouter;
