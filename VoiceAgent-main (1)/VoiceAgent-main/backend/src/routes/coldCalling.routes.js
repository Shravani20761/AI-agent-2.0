import { Router } from 'express';
import { list, getStats, logCall, listContacts, importContacts } from '../controllers/coldCalling.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.get('/stats', getStats);
router.get('/contacts', listContacts);
router.post('/import', importContacts);
router.post('/', logCall);
export default router;
