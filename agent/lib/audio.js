import { AudioFrame, AudioResampler } from '@livekit/rtc-node';

export function pcm16ToWav(samples, sampleRate) {
  const data = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

export function wavToPcm(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') {
    const copy = Buffer.from(buffer);
    return {
      sampleRate: 24000,
      pcm: new Int16Array(copy.buffer, copy.byteOffset, Math.floor(copy.length / 2)),
    };
  }
  let offset = 12;
  let sampleRate = 24000;
  let dataStart = -1;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'fmt ' && offset + 16 <= buffer.length) sampleRate = buffer.readUInt32LE(offset + 12);
    if (id === 'data') {
      dataStart = offset + 8;
      dataSize = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (dataStart < 0) throw new Error('Sarvam audio response did not contain a WAV data chunk');
  const slice = buffer.subarray(dataStart, dataStart + dataSize);
  const copy = Buffer.from(slice);
  return {
    sampleRate,
    pcm: new Int16Array(copy.buffer, copy.byteOffset, Math.floor(copy.length / 2)),
  };
}

export function chunkPcm(pcm, sampleRate, frameMs = 20) {
  const samplesPerFrame = Math.max(1, Math.round(sampleRate * frameMs / 1000));
  const frames = [];
  for (let offset = 0; offset < pcm.length; offset += samplesPerFrame) {
    const slice = pcm.subarray(offset, Math.min(pcm.length, offset + samplesPerFrame));
    const data = new Int16Array(slice);
    frames.push(new AudioFrame(data, sampleRate, 1, data.length));
  }
  return frames;
}

function downmix(frame) {
  if (frame.channels === 1) return frame.data;
  const out = new Int16Array(frame.samplesPerChannel);
  for (let i = 0; i < frame.samplesPerChannel; i += 1) {
    let sum = 0;
    for (let channel = 0; channel < frame.channels; channel += 1) {
      sum += frame.data[(i * frame.channels) + channel];
    }
    out[i] = Math.max(-32768, Math.min(32767, Math.round(sum / frame.channels)));
  }
  return out;
}

export function framesToPcm16k(frames) {
  const pieces = [];
  let resampler = null;
  let resamplerRate = 0;
  for (const frame of frames) {
    const mono = new AudioFrame(downmix(frame), frame.sampleRate, 1, frame.samplesPerChannel);
    if (mono.sampleRate === 16000) {
      pieces.push(mono.data);
      continue;
    }
    if (!resampler || resamplerRate !== mono.sampleRate) {
      resampler?.close?.();
      resampler = new AudioResampler(mono.sampleRate, 16000, 1);
      resamplerRate = mono.sampleRate;
    }
    const converted = resampler.push(mono) || [];
    for (const item of converted) pieces.push(item.data);
  }
  if (resampler) {
    for (const item of resampler.flush() || []) pieces.push(item.data);
    resampler.close();
  }
  const length = pieces.reduce((sum, piece) => sum + piece.length, 0);
  const pcm = new Int16Array(length);
  let offset = 0;
  for (const piece of pieces) {
    pcm.set(piece, offset);
    offset += piece.length;
  }
  return pcm;
}
