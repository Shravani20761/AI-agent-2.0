import { Router } from 'express';
import {
  listTimetable, upsertTimetableEntry, deleteTimetableEntry,
  listAvailability, setAvailability, deleteAvailability,
  listTests, createTest, updateTest, deleteTest,
  listFaqs, createFaq, updateFaq, deleteFaq,
} from '../controllers/academics.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Timetable
router.get('/timetable', listTimetable);
router.post('/timetable', upsertTimetableEntry);
router.delete('/timetable/:id', deleteTimetableEntry);

// Teacher availability
router.get('/availability', listAvailability);
router.post('/availability', setAvailability);
router.delete('/availability/:id', deleteAvailability);

// Test schedule
router.get('/tests', listTests);
router.post('/tests', createTest);
router.patch('/tests/:id', updateTest);
router.delete('/tests/:id', deleteTest);

// FAQ
router.get('/faqs', listFaqs);
router.post('/faqs', createFaq);
router.patch('/faqs/:id', updateFaq);
router.delete('/faqs/:id', deleteFaq);

export default router;
