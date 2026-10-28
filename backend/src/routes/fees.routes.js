import { Router } from 'express';
import { list, getByStudent, createFeePlan, recordPayment, getStats } from '../controllers/fees.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.get('/stats', getStats);
router.get('/student/:studentId', getByStudent);
router.post('/plan', createFeePlan);
router.post('/payment', recordPayment);
export default router;
