// packages/backend/src/middleware/auth.ts
import { RequestHandler } from 'express';
import { verifyToken } from '../lib/jwt';

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies['token'] as string | undefined;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });

  res.locals['userId'] = payload.userId;
  return next();
};
