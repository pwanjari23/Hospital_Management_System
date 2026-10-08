import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as documentController from '../controllers/document.controller.js';

const router = Router();

router.use(authenticate);

router.get('/branding', documentController.getBranding);
router.put('/branding', documentController.updateBranding);
router.get('/:type/:id', documentController.getDocument);

export default router;
