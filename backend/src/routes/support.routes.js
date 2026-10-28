import { Router } from 'express';
import { list, create, resolve, assign, listCallLogs } from '../controllers/support.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/call-logs', listCallLogs);
router.get('/', list);
router.post('/', create);
router.patch('/:id/resolve', resolve);
router.patch('/:id/assign', assign);
export default router;
