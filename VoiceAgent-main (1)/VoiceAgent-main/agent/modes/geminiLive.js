import * as google from '@livekit/agents-plugin-google';
import { voice } from '@livekit/agents';
import { PRIYA_PROMPT, GREETING_INSTRUCTION } from '../prompts/priya.js';
import { attachUsage } from '../lib/usageReporter.js';
import { buildCrmTools } from '../lib/mcpTools.js';

const PLUGIN_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

export async function startGeminiLive(ctx, demoCallId, reporter) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('[agent] GEMINI_LIVE was requested, but GEMINI_API_KEY is not set. No model was started.');
    return null;
  }

  const model = process.env.GEMINI_LIVE_MODEL || PLUGIN_MODEL;
  if (!process.env.GEMINI_LIVE_MODEL) {
    console.log(
      `[agent] GEMINI_LIVE_MODEL is unset. Using ${PLUGIN_MODEL}. ` +
      'gemini-2.0-flash-live-001 is not a Live API model in @livekit/agents-plugin-google 1.9.3.',
    );
  }
  const voiceName = process.env.GEMINI_LIVE_VOICE || 'Aoede';

  const session = new voice.AgentSession({
    llm: new google.realtime.RealtimeModel({
      model,
      voice: voiceName,
      apiKey,
      instructions: PRIYA_PROMPT,
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
  session.generateReply({ instructions: GREETING_INSTRUCTION });
  console.log(`[agent] Gemini Live session started. model=${model} voice=${voiceName}`);
  return session;
}
