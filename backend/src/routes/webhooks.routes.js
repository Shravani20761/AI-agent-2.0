import { Router } from 'express';
import { dograhWebhook } from '../controllers/webhooks.controller.js';

const router = Router();

// No requireAuth — Dograh calls this from the outside
router.post('/dograh', dograhWebhook);

export default router;
