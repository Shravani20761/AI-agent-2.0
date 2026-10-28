import { Router } from 'express';
import { list } from '../controllers/agentLogs.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
export default router;
