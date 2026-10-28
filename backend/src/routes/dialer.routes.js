import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/dialer.controller.js';

const router = Router();

router.get('/status',            requireAuth, c.getStatus);
router.post('/control',          requireAuth, c.control);
router.get('/queue',             requireAuth, c.listQueue);
router.post('/queue',            requireAuth, c.addToQueue);
router.get('/workflows',         requireAuth, c.listWorkflows);
router.post('/trigger/cold-call',requireAuth, c.triggerColdCall);
router.post('/trigger/hot-lead', requireAuth, c.triggerHotLead);
router.post('/trigger/admission',requireAuth, c.triggerAdmission);
router.post('/trigger/fee-recovery', requireAuth, c.triggerFeeRecovery);
router.post('/trigger/engagement',   requireAuth, c.triggerEngagement);
router.post('/trigger/review',       requireAuth, c.triggerReview);

export default router;
