import { Router } from 'express';
import { getStats } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/stats', requireAuth, getStats);
export default router;
