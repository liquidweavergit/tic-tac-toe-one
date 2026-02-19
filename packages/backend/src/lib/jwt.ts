import jwt from 'jsonwebtoken';

const secret = () => process.env.JWT_SECRET ?? 'fallback-secret';

export function signToken(userId: string): string {
  return jwt.sign({ userId }, secret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, secret()) as { userId: string };
  } catch {
    return null;
  }
}
