import { Router } from 'express';
import { list, create, complete, reschedule } from '../controllers/followUps.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.post('/', create);
router.patch('/:id/complete', complete);
router.patch('/:id/reschedule', reschedule);
export default router;
