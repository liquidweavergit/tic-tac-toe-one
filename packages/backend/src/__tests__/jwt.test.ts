import { signToken, verifyToken } from '../lib/jwt';

process.env.JWT_SECRET = 'test-secret';

describe('jwt', () => {
  it('signs and verifies a token with userId', () => {
    const token = signToken('user-123');
    const payload = verifyToken(token);
    expect(payload!.userId).toBe('user-123');
  });

  it('returns null for an invalid token', () => {
    expect(verifyToken('bad.token.here')).toBeNull();
  });
});
