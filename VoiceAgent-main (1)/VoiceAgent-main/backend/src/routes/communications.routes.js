import { Router } from 'express';
import { list, addNote } from '../controllers/communications.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.post('/', addNote);
export default router;
