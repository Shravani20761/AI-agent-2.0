import { RATES } from '../constants/rates.js';
import { modeLabel } from '../lib/format.js';

const OPTIONS = [
  {
    id: 'GEMINI_LIVE',
    detail: `Audio in ₹${RATES.geminiLive.audioInputPerMillionTokens}/million · audio out ₹${RATES.geminiLive.audioOutputPerMillionTokens}/million`,
  },
  {
    id: 'SARVAM_PIPELINE',
    detail: `STT ₹${RATES.sarvamPipeline.sttPerMinute}/min · TTS ₹${RATES.sarvamPipeline.ttsPerMinute}/min of audio · DeepSeek ₹${RATES.sarvamPipeline.deepseekInputPerMillion}/₹${RATES.sarvamPipeline.deepseekOutputPerMillion} per million`,
  },
];

export default function ModeSwitch({ activeMode, disabled, onChange }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Demo mode</h2>
        <span className="text-xs text-muted">Applies to the next demo call. CRM calls are unchanged.</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = activeMode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled || selected}
              onClick={() => onChange(option.id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                selected
                  ? 'border-secondary bg-secondary/10'
                  : 'border-line hover:border-primary disabled:hover:border-line'
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={`h-2.5 w-2.5 rounded-full ${selected ? 'bg-secondary' : 'bg-line'}`} />
                {modeLabel(option.id)}
              </span>
              <span className="mt-2 block text-xs leading-5 text-muted">{option.detail}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        These are provisional unit rates. ₹/min is calculated after the provider reports usage. Call length is not converted into tokens.
      </p>
    </section>
  );
}
