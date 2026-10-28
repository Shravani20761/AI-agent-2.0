import { Router } from 'express';
import { getPipeline, getById, create, advanceStage, recordDemoOutcome, getStats } from '../controllers/admissions.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', getPipeline);
router.get('/stats', getStats);
router.get('/:id', getById);
router.post('/', create);
router.patch('/:id/stage', advanceStage);
router.post('/demo-outcome', recordDemoOutcome);
export default router;
