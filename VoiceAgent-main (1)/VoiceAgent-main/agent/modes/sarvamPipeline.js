import * as openai from '@livekit/agents-plugin-openai';
import { inference, voice } from '@livekit/agents';
import { PRIYA_PROMPT, GREETING_INSTRUCTION } from '../prompts/priya.js';
import { attachUsage } from '../lib/usageReporter.js';
import { buildCrmTools } from '../lib/mcpTools.js';
import { SARVAM_STT_MODEL, SARVAM_TTS_MODEL, SARVAM_TTS_SPEAKER } from './sarvam/api.js';
import { SarvamSTT } from './sarvam/stt.js';
import { SarvamTTS } from './sarvam/tts.js';

export async function startSarvamPipeline(ctx, demoCallId, reporter) {
  if (!process.env.SARVAM_API_KEY) {
    console.error('[agent] SARVAM_PIPELINE was requested, but SARVAM_API_KEY is not set. No model was started.');
    return null;
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error(
      '[agent] SARVAM_PIPELINE was requested, but DEEPSEEK_API_KEY is not set. ' +
      'No model was started. OpenAI Realtime is not used as a substitute.',
    );
    return null;
  }

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
  if (!process.env.DEEPSEEK_MODEL) {
    console.log('[agent] DEEPSEEK_MODEL is unset. Using deepseek-flash. The retired deepseek-chat id is not the default.');
  }
  console.log(
    `[agent] Sarvam pipeline: STT ${SARVAM_STT_MODEL}, TTS ${SARVAM_TTS_MODEL}, speaker ${SARVAM_TTS_SPEAKER}, LLM ${model}. ` +
    'Override with SARVAM_STT_MODEL, SARVAM_TTS_MODEL, or SARVAM_TTS_SPEAKER.',
  );

  const session = new voice.AgentSession({
    vad: new inference.VAD({ model: 'silero' }),
    turnDetection: 'vad',
    stt: new SarvamSTT(),
    tts: new SarvamTTS(),
    llm: openai.LLM.withDeepSeek({ model, temperature: 0.6 }),
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
