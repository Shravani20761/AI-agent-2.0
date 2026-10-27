import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioFrame } from '@livekit/rtc-node';
import { chunkPcm, framesToPcm16k, pcm16ToWav, wavToPcm } from './lib/audio.js';
import { parseMcpBody, mcpResultText } from './lib/mcpTools.js';
import { createUsageReporter } from './lib/usageReporter.js';

test('PCM16 WAV round trip keeps the sample rate and samples', () => {
  const samples = Int16Array.from([0, 1000, -1000, 32767, -32768]);
  const decoded = wavToPcm(pcm16ToWav(samples, 16000));
  assert.equal(decoded.sampleRate, 16000);
  assert.deepEqual(Array.from(decoded.pcm), Array.from(samples));
});

test('20 ms frames split 16 kHz PCM without dropping samples', () => {
  const samples = new Int16Array(640);
  samples.fill(7);
  const frames = chunkPcm(samples, 16000, 20);
  assert.equal(frames.length, 2);
  assert.equal(frames[0].samplesPerChannel, 320);
  const restored = framesToPcm16k(frames);
  assert.equal(restored.length, 640);
  assert.equal(restored[0], 7);
  assert.equal(restored[639], 7);
});

test('MCP responses accept JSON and the last SSE data line', () => {
  const json = parseMcpBody('{"result":{"content":[{"type":"text","text":"{\\"success\\":true}"}]}}', 'application/json');
  assert.equal(mcpResultText(json), '{"success":true}');

  const sse = parseMcpBody('event: message\ndata: {"ignored":true}\n\ndata: {"result":{"content":[{"type":"text","text":"ok"}]}}\n', 'text/event-stream');
  assert.equal(mcpResultText(sse), 'ok');
});

test('usage seconds carry sub-second remainders instead of rounding each metric', () => {
  const reporter = createUsageReporter(null);
  assert.equal(reporter.secondsFromMs('stt', 400), 0);
  assert.equal(reporter.secondsFromMs('stt', 700), 1);
  assert.equal(reporter.secondsFromMs('tts', 400), 0);
  assert.equal(reporter.secondsFromMs('stt', 200), 0);
  assert.equal(reporter.secondsFromMs('stt', 900), 1);
  assert.equal(reporter.secondsFromMs('tts', 600), 1);
});

test('a 48 kHz stereo buffer is downmixed and resampled to 16 kHz', () => {
  const samplesPerChannel = 480;
  const interleaved = new Int16Array(samplesPerChannel * 2);
  for (let i = 0; i < samplesPerChannel; i += 1) {
    interleaved[i * 2] = 1000;
    interleaved[(i * 2) + 1] = 3000;
  }
  const frame = new AudioFrame(interleaved, 48000, 2, samplesPerChannel);
  const pcm = framesToPcm16k([frame]);
  const mean = pcm.reduce((sum, sample) => sum + sample, 0) / pcm.length;
  assert.ok(pcm.length > 100 && pcm.length < 220, `length ${pcm.length}`);
  assert.ok(mean > 1800 && mean < 2200, `mean ${mean}`);
});
