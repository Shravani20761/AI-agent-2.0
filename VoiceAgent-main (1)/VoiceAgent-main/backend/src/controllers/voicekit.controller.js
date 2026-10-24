import { ok, err } from '../lib/response.js';

// POST /api/voicekit/token
// Generates a LiveKit access token for browser-based voice sessions.
// Requires LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL in .env
export const createToken = async (req, res) => {
  const { roomName, identity, contactName } = req.body;

  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url       = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    return err(res, 'LiveKit not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL in backend .env', 503);
  }

  try {
    // Dynamically import livekit-server-sdk so the server starts fine without it
    const { AccessToken } = await import('livekit-server-sdk');

    const room     = roomName || `voicecrm-demo-${Date.now()}`;
    const tokenId  = identity || `user-${Date.now()}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: tokenId,
      ttl:      3600,
      name:     contactName || tokenId,
    });

    at.addGrant({
      roomJoin:     true,
      room,
      canPublish:   true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    ok(res, { token, url, room });
  } catch (e) {
    err(res, `Token generation failed: ${e.message}. Run: npm install livekit-server-sdk`, 500);
  }
};

// GET /api/voicekit/config
// Returns LiveKit connection config for the frontend
export const getConfig = async (_req, res) => {
  ok(res, {
    enabled: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_URL),
    url:     process.env.LIVEKIT_URL || null,
  });
};
