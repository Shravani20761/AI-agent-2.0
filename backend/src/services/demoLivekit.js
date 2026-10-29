import { randomBytes } from 'node:crypto';

function httpHost(url) {
  return url.replace(/^ws/i, 'http');
}

function configuredFlag(name) {
  const value = process.env[name];
  return Boolean(value && value.trim() && !value.includes('replace-with') && !value.includes('changeme'));
}

export function livekitConfigured() {
  return configuredFlag('LIVEKIT_URL') && configuredFlag('LIVEKIT_API_KEY') && configuredFlag('LIVEKIT_API_SECRET');
}

export function providerFlags() {
  return {
    livekit: {
      configured: livekitConfigured(),
      integrated: livekitConfigured(),
    },
    geminiLive: {
      configured: configuredFlag('GEMINI_API_KEY'),
      integrated: false,
      note: 'The agent can open a Gemini Live session. A live call has not been verified, so this stays unverified.',
    },
    sarvam: {
      configured: configuredFlag('SARVAM_API_KEY'),
      integrated: false,
      note: 'The agent can call Sarvam STT and TTS. A live call has not been verified, so this stays unverified.',
    },
    deepseek: {
      configured: configuredFlag('DEEPSEEK_API_KEY'),
      integrated: false,
      note: 'The Sarvam pipeline can call DeepSeek. A live call has not been verified, so this stays unverified.',
    },
  };
}

export function makeRoomName() {
  return `demo-${Date.now()}-${randomBytes(3).toString('hex')}`;
}

/**
 * Creates the LiveKit room first and writes mode + demoCallId onto room metadata.
 * The participant grant cannot carry room metadata in livekit-server-sdk 2.x.
 * This never places a PSTN call.
 */
export async function openDemoRoom({ roomName, metadata, displayName }) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) {
    const error = new Error('LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.');
    error.status = 503;
    throw error;
  }

  const { AccessToken, RoomServiceClient } = await import('livekit-server-sdk');
  const rooms = new RoomServiceClient(httpHost(url), apiKey, apiSecret);
  const encoded = JSON.stringify({ mode: metadata.mode, demoCallId: metadata.demoCallId });
  const existing = await rooms.listRooms([roomName]);
  if (existing.length > 0) {
    await rooms.updateRoomMetadata(roomName, encoded);
  } else {
    await rooms.createRoom({ name: roomName, metadata: encoded, emptyTimeout: 300 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: `demo-${randomBytes(4).toString('hex')}`,
    ttl: 3600,
    name: displayName || 'Demo User',
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const publicUrl = process.env.LIVEKIT_PUBLIC_URL || url;
  return { token: await at.toJwt(), url: publicUrl, roomName };
}
