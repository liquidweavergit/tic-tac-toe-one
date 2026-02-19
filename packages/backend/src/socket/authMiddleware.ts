import { Socket } from 'socket.io';
import cookie from 'cookie';
import { verifyToken } from '../lib/jwt';

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const rawCookies = socket.handshake.headers.cookie ?? '';
  const cookies = cookie.parse(rawCookies);
  const token = cookies['token'];

  if (!token) return next(new Error('Unauthorized'));

  const payload = verifyToken(token);
  if (!payload) return next(new Error('Invalid token'));

  socket.data.userId = payload.userId;
  return next();
}
