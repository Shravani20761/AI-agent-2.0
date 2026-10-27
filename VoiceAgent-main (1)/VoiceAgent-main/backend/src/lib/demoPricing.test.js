import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCallCost, RATES } from './demoPricing.js';
import { applyUsage, finalizeCall, summarizeCalls } from './demoUsage.js';
import { sanitizePayload } from './demoSanitize.js';

test('Gemini cost uses reported tokens and ignores the tokens-per-second hint', () => {
  const priced = computeCallCost('GEMINI_LIVE', {
    audioInputTokens: 1_000_000,
    audioOutputTokens: 1_000_000,
  }, 180);
  assert.equal(priced.totalCostInr, RATES.geminiLive.audioInputPerMillionTokens + RATES.geminiLive.audioOutputPerMillionTokens);
  assert.equal(priced.usageCompleteness, 'measured');
  assert.equal(priced.costBasis, 'provisional_estimate');

  const unmeasured = computeCallCost('GEMINI_LIVE', {}, 180);
  assert.equal(unmeasured.totalCostInr, null);
  assert.equal(unmeasured.usageCompleteness, 'unavailable');
  assert.equal(RATES.geminiLive.tokensPerSecondUsedForBilling, false);
});

test('Sarvam TTS characters are stored and not billed', () => {
  const charactersOnly = computeCallCost('SARVAM_PIPELINE', { ttsCharacters: 5000 }, 60);
  assert.equal(charactersOnly.totalCostInr, null);
  assert.equal(charactersOnly.parts.find((part) => part.field === 'ttsCharacters').status, 'recorded_not_billed');

  const withAudio = computeCallCost('SARVAM_PIPELINE', {
    sttAudioSecs: 60,
    llmInputTokens: 1_000_000,
    llmOutputTokens: 1_000_000,
    ttsAudioSecs: 60,
    ttsCharacters: 5000,
  }, 60);
  assert.equal(withAudio.totalCostInr, 0.48 + 25.92 + 105.6 + 0.67);
});

test('snapshot retries do not double-count and delta retries with the same seq are ignored', () => {
  const first = applyUsage({ lastUsageSeq: null }, { audioInputTokens: 100, kind: 'snapshot' }, { kind: 'snapshot', usageSeq: 1 });
  const retry = applyUsage({ ...first.usage, lastUsageSeq: first.lastUsageSeq }, { audioInputTokens: 100 }, { kind: 'snapshot', usageSeq: 1 });
  assert.equal(retry.applied, false);
  assert.equal(retry.usage.audioInputTokens, 100);

  const delta = applyUsage({ ...first.usage, lastUsageSeq: 1 }, { audioInputTokens: 25 }, { kind: 'delta', usageSeq: 2 });
  assert.equal(delta.usage.audioInputTokens, 125);
});

test('ending a call is idempotent and summary averages skip active and failed rows', () => {
  const started = { mode: 'GEMINI_LIVE', status: 'ACTIVE', startedAt: new Date('2026-10-26T00:00:00Z'), endedAt: null, audioInputTokens: 1_000_000, audioOutputTokens: 0 };
  const ended = finalizeCall(started, new Date('2026-10-26T00:03:00Z'));
  assert.equal(ended.alreadyEnded, false);
  assert.equal(ended.call.status, 'COMPLETED');
  assert.equal(ended.call.durationSecs, 180);
  const again = finalizeCall(ended.call, new Date('2026-10-26T00:10:00Z'), { audioInputTokens: 9_000_000 });
  assert.equal(again.alreadyEnded, true);
  assert.equal(again.call.audioInputTokens, 1_000_000);

  const summary = summarizeCalls([
    ended.call,
    { mode: 'GEMINI_LIVE', status: 'ACTIVE', endedAt: null, totalCostInr: 999, costPerMinInr: 999, durationSecs: 10 },
    { mode: 'GEMINI_LIVE', status: 'FAILED', endedAt: new Date(), totalCostInr: 50, costPerMinInr: 50, durationSecs: 1 },
    { mode: 'SARVAM_PIPELINE', status: 'COMPLETED', endedAt: new Date(), totalCostInr: null, costPerMinInr: null, durationSecs: 30 },
  ]);
  assert.equal(summary.GEMINI_LIVE.completedCallCount, 1);
  assert.equal(summary.GEMINI_LIVE.failedCallCount, 1);
  assert.equal(summary.GEMINI_LIVE.activeCallCount, 1);
  assert.equal(summary.GEMINI_LIVE.totalCostInr, ended.call.totalCostInr);
  assert.equal(summary.SARVAM_PIPELINE.completedCallCount, 1);
  assert.equal(summary.SARVAM_PIPELINE.totalCostInr, null);
  assert.equal(summary.SARVAM_PIPELINE.avgDurationSecs, 30);
});

test('tool payloads redact secrets and phone numbers', () => {
  const clean = sanitizePayload({
    apiKey: 'sk-secret',
    phone: '919812345678',
    course: 'iit-jee',
  });
  assert.equal(clean.value.apiKey, '[redacted]');
  assert.equal(clean.value.phone, '***78');
  assert.equal(clean.value.course, 'iit-jee');
});
