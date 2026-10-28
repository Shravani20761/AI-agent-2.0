import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  getConfig,
  setMode,
  startCall,
  updateUsage,
  endCall,
  listCalls,
  getCall,
  getSummary,
  logToolCall,
  clearHistory,
} from '../controllers/demo.controller.js';

const router = Router();
const modeEnum = z.enum(['GEMINI_LIVE', 'SARVAM_PIPELINE']);
const count = z.number().int().nonnegative();

function usageSchema() {
  return z.object({
    kind: z.enum(['snapshot', 'delta']).default('snapshot'),
    usageSeq: z.number().int().positive().optional(),
    audioInputTokens: count.max(1_000_000_000_000).optional(),
    audioOutputTokens: count.max(1_000_000_000_000).optional(),
    sttAudioSecs: count.max(86_400).optional(),
    ttsCharacters: count.max(10_000_000).optional(),
    ttsAudioSecs: count.max(86_400).optional(),
    llmInputTokens: count.max(1_000_000_000_000).optional(),
    llmOutputTokens: count.max(1_000_000_000_000).optional(),
  });
}

const jsonValue = z.any();

router.get('/config', getConfig);
router.post('/mode', rateLimit({ name: 'demo-mode', limit: 30, windowMs: 60_000 }), validate(z.object({ mode: modeEnum })), setMode);
router.post(
  '/call/start',
  rateLimit({ name: 'demo-start', limit: 10, windowMs: 60_000 }),
  validate(z.object({
    contactName: z.string().trim().max(120).optional(),
    contactPhone: z.string().trim().max(20).optional(),
    contactCourse: z.string().trim().max(120).optional(),
  })),
  startCall,
);
router.patch('/call/:id/usage', validate(z.object({ id: z.string().uuid() }), 'params'), validate(usageSchema()), updateUsage);
router.post(
  '/call/:id/end',
  validate(z.object({ id: z.string().uuid() }), 'params'),
  validate(z.object({ finalUsage: usageSchema().optional() })),
  endCall,
);
router.get(
  '/calls',
  validate(z.object({
    mode: modeEnum.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    page: z.coerce.number().int().min(1).default(1),
  }), 'query'),
  listCalls,
);
router.get('/calls/:id', validate(z.object({ id: z.string().uuid() }), 'params'), getCall);
router.get('/summary', getSummary);
router.post(
  '/tool-call',
  rateLimit({ name: 'demo-tool', limit: 120, windowMs: 60_000 }),
  validate(z.object({
    demoCallId: z.string().uuid(),
    toolName: z.string().trim().min(1).max(80),
    arguments: jsonValue.optional(),
    result: jsonValue.optional(),
    durationMs: z.number().int().nonnegative().max(600_000).optional(),
    success: z.boolean().optional(),
  })),
  logToolCall,
);
router.delete(
  '/calls',
  rateLimit({ name: 'demo-delete', limit: 5, windowMs: 60_000 }),
  validate(z.object({
    confirm: z.literal('DELETE_DEMO_HISTORY'),
    mode: modeEnum.optional(),
  })),
  clearHistory,
);

export default router;
