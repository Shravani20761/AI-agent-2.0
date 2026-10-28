import test from 'node:test';
import assert from 'node:assert/strict';
import { RATES, computeCallCost } from './rates.js';

test('Gemini cost uses reported audio tokens and ignores tokens per second', () => {
  const priced = computeCallCost('GEMINI_LIVE', {
    audioInputTokens: 1_000_000,
    audioOutputTokens: 1_000_000,
  }, 180);
  assert.equal(priced.totalCostInr, RATES.geminiLive.audioInputPerMillionTokens + RATES.geminiLive.audioOutputPerMillionTokens);
  assert.equal(priced.usageCompleteness, 'measured');
  assert.equal(RATES.geminiLive.tokensPerSecondUsedForBilling, false);

  const unmeasured = computeCallCost('GEMINI_LIVE', {}, 180);
  assert.equal(unmeasured.totalCostInr, null);
  assert.equal(unmeasured.costPerMinInr, null);
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
