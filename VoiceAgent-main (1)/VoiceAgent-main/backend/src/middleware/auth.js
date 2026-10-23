import jwt from 'jsonwebtoken';
import { err } from '../lib/response.js';

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return err(res, 'Unauthorized', 401);

  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    err(res, 'Token invalid or expired', 401);
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return err(res, 'Forbidden', 403);
  next();
};
