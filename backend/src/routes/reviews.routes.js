import { Router } from 'express';
import { list, create, markReceived } from '../controllers/reviews.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.post('/', create);
router.patch('/:id/received', markReceived);
export default router;
