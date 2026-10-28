import { stt } from '@livekit/agents';
import { framesToPcm16k, pcm16ToWav } from '../../lib/audio.js';
import { SARVAM_STT_MODEL, transcribeWav } from './api.js';

const { SpeechEventType } = stt;

function finalEvent(text) {
  return {
    type: SpeechEventType.FINAL_TRANSCRIPT,
    alternatives: [{
      language: 'en',
      text,
      startTime: 0,
      endTime: 0,
      confidence: 1,
    }],
  };
}

class SarvamSpeechStream extends stt.SpeechStream {
  label = 'sarvam.STT';

  constructor(parent) {
    super(parent, 16000);
  }

  async run() {
    const frames = [];
    for await (const item of this.input) {
      if (item === stt.SpeechStream.FLUSH_SENTINEL) {
        if (frames.length) await this.#recognize(frames.splice(0));
        continue;
      }
      frames.push(item);
    }
    if (frames.length) await this.#recognize(frames);
  }

  async #recognize(frames) {
    const pcm = framesToPcm16k(frames);
    const duration = pcm.length / 16000;
    if (!pcm.length) return;
    this.queue.put({ type: SpeechEventType.START_OF_SPEECH });
    const { text } = await transcribeWav(pcm16ToWav(pcm, 16000), this.abortSignal);
    if (text) this.queue.put(finalEvent(text));
    this.queue.put({
      type: SpeechEventType.RECOGNITION_USAGE,
      recognitionUsage: { audioDuration: duration },
    });
    this.queue.put({
      type: SpeechEventType.END_OF_SPEECH,
      alternatives: [{
        language: 'en',
        text,
        startTime: 0,
        endTime: duration,
        confidence: text ? 1 : 0,
      }],
    });
  }
}

export class SarvamSTT extends stt.STT {
  label = 'sarvam.STT';

  constructor() {
    super({ streaming: true, interimResults: false });
  }

  get model() {
    return SARVAM_STT_MODEL;
  }

  get provider() {
    return 'sarvam';
  }

  stream() {
    return new SarvamSpeechStream(this);
  }

  async _recognize(frame) {
    const frames = Array.isArray(frame) ? frame : [frame];
    const pcm = framesToPcm16k(frames);
    const duration = pcm.length / 16000;
    if (!pcm.length) return finalEvent('');
    const { text } = await transcribeWav(pcm16ToWav(pcm, 16000));
    return {
      ...finalEvent(text),
      recognitionUsage: { audioDuration: duration },
    };
  }
}
