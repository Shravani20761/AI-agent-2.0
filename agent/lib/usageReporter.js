const backendUrl = () => (process.env.DEMO_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export function createUsageReporter(demoCallId) {
  let seq = 0;
  const leftoverMs = { stt: 0, tts: 0 };

  async function post(path, body) {
    if (!demoCallId) return null;
    const response = await fetch(`${backendUrl()}/api/demo/call/${demoCallId}${path}`, {
      method: path.endsWith('/usage') ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Demo usage request failed (${response.status}): ${text.slice(0, 300)}`);
    }
    return response.json();
  }

  return {
    secondsFromMs(kind, ms) {
      if (!Number.isFinite(ms) || ms <= 0) return 0;
      leftoverMs[kind] = (leftoverMs[kind] || 0) + ms;
      const whole = Math.floor(leftoverMs[kind] / 1000);
      leftoverMs[kind] -= whole * 1000;
      return whole;
    },
    async delta(fields) {
      const body = {};
      for (const [key, value] of Object.entries(fields)) {
        if (Number.isFinite(value) && value > 0) body[key] = Math.round(value);
      }
      if (!Object.keys(body).length) return;
      seq += 1;
      try {
        await post('/usage', { kind: 'delta', usageSeq: seq, ...body });
      } catch (error) {
        console.error(`[agent] Usage report failed: ${error.message}`);
      }
    },
    async end() {
      try {
        await post('/end', {});
      } catch (error) {
        console.error(`[agent] End-call report failed: ${error.message}`);
      }
    },
  };
}

export function attachUsage(session, reporter) {
  session.on('metrics_collected', (event) => {
    const metrics = event.metrics;
    if (!metrics) return;
    if (metrics.type === 'realtime_model_metrics') {
      const inDetails = metrics.inputTokenDetails;
      const outDetails = metrics.outputTokenDetails;
      const splitMissing = (side, details) => (
        side > 0 && details && details.audioTokens === 0 && details.textTokens === 0 && details.imageTokens === 0
      );
      if (!inDetails || !outDetails || splitMissing(metrics.inputTokens, inDetails) || splitMissing(metrics.outputTokens, outDetails)) {
        if ((metrics.inputTokens || 0) + (metrics.outputTokens || 0) > 0) {
          console.warn('[agent] Gemini response did not include an audio token split. Token counts were not estimated.');
        }
        return;
      }
      reporter.delta({
        audioInputTokens: inDetails.audioTokens,
        audioOutputTokens: outDetails.audioTokens,
      });
      return;
    }
    if (metrics.type === 'stt_metrics') {
      reporter.delta({ sttAudioSecs: reporter.secondsFromMs('stt', metrics.audioDurationMs) });
      return;
    }
    if (metrics.type === 'llm_metrics') {
      reporter.delta({
        llmInputTokens: metrics.promptTokens,
        llmOutputTokens: metrics.completionTokens,
      });
      return;
    }
    if (metrics.type === 'tts_metrics') {
      reporter.delta({
        ttsCharacters: metrics.charactersCount,
        ttsAudioSecs: reporter.secondsFromMs('tts', metrics.audioDurationMs),
      });
    }
  });

  session.on('error', (event) => {
    const err = event?.error ?? event;
    const message = err?.message || String(err) || 'unknown session error';
    const stack = err?.stack ? `\n${err.stack}` : '';
    console.error(`[agent] Model session error: ${message}${stack}`);
  });
}
