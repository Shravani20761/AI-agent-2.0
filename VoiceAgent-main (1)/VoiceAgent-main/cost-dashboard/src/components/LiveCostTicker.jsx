import { useEffect, useState } from 'react';
import { formatCount, formatDuration, formatInr } from '../lib/format.js';

function Metric({ label, value }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 250);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={`rounded-xl bg-background px-3 py-2 transition ${pulse ? 'bg-primary/5' : ''}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function LiveCostTicker({ mode, call, startedAt, status }) {
  const [now, setNow] = useState(Date.now());
  const live = status === 'CONNECTING' || status === 'WAITING' || status === 'IN_CALL';

  useEffect(() => {
    if (!live || !startedAt) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [live, startedAt]);

  const duration = call?.durationSecs != null && !live
    ? call.durationSecs
    : startedAt
      ? Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000))
      : 0;

  const gemini = mode === 'GEMINI_LIVE';
  const ended = status === 'ENDED';

  return (
    <section className={`rounded-2xl border bg-surface p-4 ${ended ? 'border-secondary' : 'border-line'}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Live cost</h2>
        {ended && <span className="text-xs font-semibold text-secondary">Call completed</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Duration" value={formatDuration(duration)} />
        <Metric label="Total" value={formatInr(call?.totalCostInr, 'Waiting for usage')} />
        <Metric label="₹ / min" value={formatInr(call?.costPerMinInr, 'Waiting for usage')} />
        <Metric label="Usage" value={call?.usageCompleteness || 'unavailable'} />
        {gemini ? (
          <>
            <Metric label="Audio input tokens" value={formatCount(call?.audioInputTokens)} />
            <Metric label="Audio output tokens" value={formatCount(call?.audioOutputTokens)} />
          </>
        ) : (
          <>
            <Metric label="STT seconds" value={formatCount(call?.sttAudioSecs)} />
            <Metric label="TTS audio seconds" value={formatCount(call?.ttsAudioSecs)} />
            <Metric label="TTS characters" value={formatCount(call?.ttsCharacters)} />
            <Metric label="LLM input tokens" value={formatCount(call?.llmInputTokens)} />
            <Metric label="LLM output tokens" value={formatCount(call?.llmOutputTokens)} />
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        TTS characters are recorded and not billed. A blank cost means the provider has not reported usage yet.
      </p>
    </section>
  );
}
