/** Provisional rates. Matches backend/src/lib/demoPricing.js. Not an invoice. */
export const PRICING_VERSION = '2026-10-provisional';

export const RATES = {
  inrPerUsd: 96,
  geminiLive: {
    audioInputPerMillionTokens: 67.2,
    audioOutputPerMillionTokens: 816,
    tokensPerSecond: 25,
    tokensPerSecondUsedForBilling: false,
  },
  sarvamPipeline: {
    sttPerMinute: 0.48,
    ttsPerMinute: 0.67,
    ttsBillingUnit: 'audio_seconds',
    deepseekInputPerMillion: 25.92,
    deepseekOutputPerMillion: 105.6,
  },
};

export const BENCHMARK_CALLS = 10;

export function roundInr(value) {
  return Math.round(value * 10000) / 10000;
}

function tokenCost(tokens, perMillion) {
  return (tokens / 1_000_000) * perMillion;
}

function minuteCost(seconds, perMinute) {
  return (seconds / 60) * perMinute;
}

export function computeCallCost(mode, usage = {}, durationSecs = 0) {
  const parts = [];
  let total = 0;
  let measured = 0;
  let missing = 0;

  const take = (field, amount, label) => {
    if (usage[field] == null) {
      missing += 1;
      parts.push({ label, field, status: 'unavailable', amountInr: null });
      return;
    }
    measured += 1;
    total += amount;
    parts.push({ label, field, status: 'provisional_estimate', amountInr: roundInr(amount) });
  };

  if (mode === 'GEMINI_LIVE') {
    take('audioInputTokens', tokenCost(usage.audioInputTokens ?? 0, RATES.geminiLive.audioInputPerMillionTokens), 'Gemini audio input');
    take('audioOutputTokens', tokenCost(usage.audioOutputTokens ?? 0, RATES.geminiLive.audioOutputPerMillionTokens), 'Gemini audio output');
  } else if (mode === 'SARVAM_PIPELINE') {
    take('sttAudioSecs', minuteCost(usage.sttAudioSecs ?? 0, RATES.sarvamPipeline.sttPerMinute), 'Sarvam STT');
    take('llmInputTokens', tokenCost(usage.llmInputTokens ?? 0, RATES.sarvamPipeline.deepseekInputPerMillion), 'DeepSeek input');
    take('llmOutputTokens', tokenCost(usage.llmOutputTokens ?? 0, RATES.sarvamPipeline.deepseekOutputPerMillion), 'DeepSeek output');
    take('ttsAudioSecs', minuteCost(usage.ttsAudioSecs ?? 0, RATES.sarvamPipeline.ttsPerMinute), 'Sarvam TTS');
    if (usage.ttsCharacters != null && usage.ttsAudioSecs == null) {
      parts.push({
        label: 'Sarvam TTS characters',
        field: 'ttsCharacters',
        status: 'recorded_not_billed',
        amountInr: null,
      });
    }
  }

  const usageCompleteness = measured === 0 ? 'unavailable' : missing > 0 ? 'partial' : 'measured';
  const totalCostInr = measured === 0 ? null : roundInr(total);
  const costPerMinInr = totalCostInr != null && durationSecs > 0
    ? roundInr(totalCostInr / (durationSecs / 60))
    : null;

  return {
    totalCostInr,
    costPerMinInr,
    usageCompleteness,
    parts,
    pricingVersion: PRICING_VERSION,
    costBasis: 'provisional_estimate',
  };
}

export function computeCostInr(mode, usage, durationSecs) {
  return computeCallCost(mode, usage, durationSecs);
}
