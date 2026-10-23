import { Router } from 'express';
import { list, create, update } from '../controllers/appointments.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
export default router;
