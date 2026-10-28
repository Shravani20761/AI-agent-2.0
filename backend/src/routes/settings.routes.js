import { Router } from 'express';
import { getSettings, updateSettings, clearDatabase } from '../controllers/settings.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', getSettings);
router.patch('/', updateSettings);
router.post('/clear-db', requireRole('ADMIN'), clearDatabase);
export default router;
