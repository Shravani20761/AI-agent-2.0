import { tts } from '@livekit/agents';
import { chunkPcm, wavToPcm } from '../../lib/audio.js';
import { SARVAM_TTS_MODEL, synthesizeSpeech } from './api.js';

async function framesForText(text, signal) {
  const spoken = text.trim();
  if (!spoken) return { frames: [], characters: 0 };
  const encoded = await synthesizeSpeech(spoken, signal);
  const decoded = wavToPcm(encoded);
  return { frames: chunkPcm(decoded.pcm, decoded.sampleRate), characters: spoken.length };
}

class SarvamChunked extends tts.ChunkedStream {
  label = 'sarvam.TTS';

  async run() {
    const { frames } = await framesForText(this.inputText, this.abortSignal);
    frames.forEach((frame, index) => {
      this.queue.put({
        requestId: 'sarvam',
        segmentId: 'sarvam',
        frame,
        final: index === frames.length - 1,
      });
    });
  }
}

class SarvamSynthesizeStream extends tts.SynthesizeStream {
  label = 'sarvam.TTS';

  async run() {
    let pending = '';
    for await (const item of this.input) {
      if (item === tts.SynthesizeStream.FLUSH_SENTINEL) {
        if (pending.trim()) await this.#speak(pending);
        pending = '';
        continue;
      }
      pending += item;
    }
    if (pending.trim()) await this.#speak(pending);
  }

  async #speak(text) {
    this.markStarted();
    const { frames } = await framesForText(text, this.abortSignal);
    frames.forEach((frame, index) => {
      this.queue.put({
        requestId: 'sarvam',
        segmentId: 'sarvam',
        frame,
        final: index === frames.length - 1,
      });
    });
  }
}

export class SarvamTTS extends tts.TTS {
  label = 'sarvam.TTS';

  constructor() {
    super(24000, 1, { streaming: true });
  }

  get model() {
    return SARVAM_TTS_MODEL;
  }

  get provider() {
    return 'sarvam';
  }

  synthesize(text, connOptions, abortSignal) {
    return new SarvamChunked(text, this, connOptions, abortSignal);
  }

  stream(options) {
    return new SarvamSynthesizeStream(this, options?.connOptions);
  }
}
