import { Router } from 'express';
import { list, getById, update, createStudent, bulkImport, assignBatch } from '../controllers/students.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.post('/', createStudent);
router.post('/bulk', bulkImport);
router.get('/:id', getById);
router.patch('/:id', update);
router.patch('/:id/batch', assignBatch);
export default router;
