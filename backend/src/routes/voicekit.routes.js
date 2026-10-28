import { Router } from 'express';
import { createToken, getConfig } from '../controllers/voicekit.controller.js';

const router = Router();

router.get('/config', getConfig);
router.post('/token', createToken);

export default router;
