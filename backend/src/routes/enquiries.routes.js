import { Router } from 'express';
import { list, getById, create, update, remove, getStats } from '../controllers/enquiries.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.get('/stats', getStats);
router.get('/:id', getById);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);
export default router;
