import { Router } from 'express';
import { list, getBatches } from '../controllers/courses.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.get('/batches', getBatches);
export default router;
