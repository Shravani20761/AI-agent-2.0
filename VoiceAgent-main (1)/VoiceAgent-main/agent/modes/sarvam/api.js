const STT_URL = 'https://api.sarvam.ai/speech-to-text';
const TTS_URL = 'https://api.sarvam.ai/text-to-speech';

export const SARVAM_STT_MODEL = process.env.SARVAM_STT_MODEL || 'saaras:v4';
export const SARVAM_TTS_MODEL = process.env.SARVAM_TTS_MODEL || 'bulbul:v3';
export const SARVAM_TTS_SPEAKER = process.env.SARVAM_TTS_SPEAKER || 'priya';

function apiKey() {
  const key = process.env.SARVAM_API_KEY;
  if (!key) {
    const error = new Error('SARVAM_API_KEY is not set');
    error.status = 503;
    throw error;
  }
  return key;
}

async function readError(response) {
  const text = await response.text();
  return text.replace(/api-subscription-key[^,\s]*/gi, '[redacted]').slice(0, 400);
}

export async function transcribeWav(wav, signal) {
  const form = new FormData();
  form.append('file', new Blob([wav], { type: 'audio/wav' }), 'speech.wav');
  form.append('model', SARVAM_STT_MODEL);
  form.append('language_code', 'en-IN');
  if (SARVAM_STT_MODEL.startsWith('saaras:v3')) form.append('mode', 'transcribe');

  const response = await fetch(STT_URL, {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey() },
    body: form,
    signal,
  });
  if (!response.ok) throw new Error(`Sarvam STT failed (${response.status}): ${await readError(response)}`);
  const body = await response.json();
  const text = body.transcript || body.text || body.diarized_transcript || '';
  return { text: String(text).trim(), requestId: body.request_id || null };
}

function ttsBody(text) {
  const shared = {
    target_language_code: 'en-IN',
    speaker: SARVAM_TTS_SPEAKER,
    model: SARVAM_TTS_MODEL,
    pace: 1,
    speech_sample_rate: 24000,
  };
  if (SARVAM_TTS_MODEL.startsWith('bulbul:v3')) return { ...shared, text };
  return {
    ...shared,
    inputs: [text],
    pitch: 0,
    loudness: 1,
    enable_preprocessing: true,
  };
}

export async function synthesizeSpeech(text, signal) {
  const response = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey(),
      'content-type': 'application/json',
    },
    body: JSON.stringify(ttsBody(text)),
    signal,
  });
  if (!response.ok) throw new Error(`Sarvam TTS failed (${response.status}): ${await readError(response)}`);
  const body = await response.json();
  const encoded = body.audios?.[0] || body.audio || body.audio_content;
  if (!encoded) throw new Error('Sarvam TTS returned no audio');
  return Buffer.from(encoded, 'base64');
}
