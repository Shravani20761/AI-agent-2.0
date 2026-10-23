import { Router } from 'express';
import { list, getById, create, update } from '../controllers/warmLeads.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.get('/:id', getById);
router.post('/', create);
router.patch('/:id', update);
export default router;
