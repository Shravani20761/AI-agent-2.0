import 'dotenv/config';
import { cli, defineAgent, WorkerOptions } from '@livekit/agents';
import { fileURLToPath } from 'node:url';
import { createUsageReporter } from './lib/usageReporter.js';
// Dynamic imports — loaded only when that mode is actually dispatched.
// Static imports here would load @livekit/agents-plugin-google (2.5s) and
// the 33MB local-inference native binary in every child process before it
// can signal ready, reliably exceeding the 10s supervised-process timeout.

function readRoomMeta(room) {
  try {
    const parsed = JSON.parse(room?.metadata || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function holdRoom(ctx, session, reporter) {
  let closing;
  const shutdown = () => {
    if (!closing) {
      closing = (async () => {
        if (session) {
          try {
            await session.close();
          } catch (error) {
            console.error(`[agent] Session close failed: ${error.message}`);
          }
        }
        await reporter.end();
      })();
    }
    return closing;
  };

  if (typeof ctx.addShutdownCallback === 'function') {
    ctx.addShutdownCallback(shutdown);
  }

  await new Promise((resolve) => {
    ctx.room?.on?.('disconnected', resolve);
  });
  await shutdown();
}

export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect();
    const meta = readRoomMeta(ctx.room);
    const mode = typeof meta.mode === 'string' ? meta.mode : '';
    const demoCallId = typeof meta.demoCallId === 'string' ? meta.demoCallId : null;
    const reporter = createUsageReporter(demoCallId);
    const roomName = ctx.room?.name || '(unknown)';
    let session = null;

    try {
      if (mode === 'GEMINI_LIVE') {
        const { startGeminiLive } = await import('./modes/geminiLive.js');
        session = await startGeminiLive(ctx, demoCallId, reporter);
      } else if (mode === 'SARVAM_PIPELINE') {
        const { startSarvamPipeline } = await import('./modes/sarvamPipeline.js');
        session = await startSarvamPipeline(ctx, demoCallId, reporter);
      } else {
        console.log(
          `[agent] Room ${roomName} mode is ${mode || 'unset'}. ` +
          'No model was started. Rooms without demo metadata stay model-less.',
        );
      }
    } catch (error) {
      console.error(`[agent] ${mode || 'unknown'} failed to start: ${error.message}. No fallback model was loaded.`);
      session = null;
    }

    if (!session && (mode === 'GEMINI_LIVE' || mode === 'SARVAM_PIPELINE')) {
      console.error(`[agent] ${mode} is not running in ${roomName}. The room stays open with no model.`);
    }

    await holdRoom(ctx, session, reporter);
    console.log(`[agent] Room ${roomName} closed.`);
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
