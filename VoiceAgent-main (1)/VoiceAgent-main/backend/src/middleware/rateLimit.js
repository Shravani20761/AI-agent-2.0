import { err } from '../lib/response.js';

const buckets = new Map();

export function rateLimit({ name, limit, windowMs }) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'local';
    const key = `${name}:${ip}`;
    const now = Date.now();
    const recent = (buckets.get(key) || []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= limit) return err(res, 'Too many requests', 429);
    recent.push(now);
    buckets.set(key, recent);
    next();
  };
}
