import * as openai from '@livekit/agents-plugin-openai';
import { inference, voice } from '@livekit/agents';
import { PRIYA_PROMPT, GREETING_INSTRUCTION } from '../prompts/priya.js';
import { attachUsage } from '../lib/usageReporter.js';
import { buildCrmTools } from '../lib/mcpTools.js';
import { SARVAM_STT_MODEL, SARVAM_TTS_MODEL, SARVAM_TTS_SPEAKER } from './sarvam/api.js';
import { SarvamSTT } from './sarvam/stt.js';
import { SarvamTTS } from './sarvam/tts.js';

// Gemini's OpenAI-compatible endpoint — used as LLM fallback when DEEPSEEK_API_KEY is absent.
const GEMINI_OPENAI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash';

function resolveLlm() {
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://openrouter.ai/api/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek/deepseek-chat',
      backend: 'DeepSeek/OpenRouter',
    };
  }
  if (process.env.GEMINI_API_KEY) {
    return {
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: GEMINI_OPENAI_BASE,
      model: process.env.GEMINI_PIPELINE_MODEL || GEMINI_DEFAULT_MODEL,
      backend: 'Gemini (OpenAI-compat fallback)',
    };
  }
  return null;
}

export async function startSarvamPipeline(ctx, demoCallId, reporter) {
  if (!process.env.SARVAM_API_KEY) {
    console.error('[agent] SARVAM_PIPELINE was requested, but SARVAM_API_KEY is not set. No model was started.');
    return null;
  }

  const llmConfig = resolveLlm();
  if (!llmConfig) {
    console.error(
      '[agent] SARVAM_PIPELINE was requested, but neither DEEPSEEK_API_KEY nor GEMINI_API_KEY is set. ' +
      'No model was started.',
    );
    return null;
  }

  console.log(
    `[agent] Sarvam pipeline: STT ${SARVAM_STT_MODEL}, TTS ${SARVAM_TTS_MODEL}, speaker ${SARVAM_TTS_SPEAKER}, ` +
    `LLM ${llmConfig.model} @ ${llmConfig.baseURL} (${llmConfig.backend}).`,
  );

  const session = new voice.AgentSession({
    vad: new inference.VAD({ model: 'silero' }),
    turnDetection: 'vad',
    stt: new SarvamSTT(),
    tts: new SarvamTTS(),
    llm: new openai.LLM({
      model: llmConfig.model,
      baseURL: llmConfig.baseURL,
      apiKey: llmConfig.apiKey,
      temperature: 0.6,
    }),
  });
  attachUsage(session, reporter);
  await session.start({
    agent: voice.Agent.create({
      instructions: PRIYA_PROMPT,
      tools: buildCrmTools(demoCallId),
    }),
    room: ctx.room,
  });
  session.generateReply({ instructions: GREETING_INSTRUCTION, inputModality: 'text' });
  console.log('[agent] Sarvam pipeline session started.');
  return session;
}
