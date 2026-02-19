import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';

export const authRouter = Router();

const BCRYPT_ROUNDS = 12;

function setAuthCookie(res: import('express').Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

authRouter.post('/signUp', async (req, res) => {
  try {
    const { username, password, screenName } = req.body as {
      username: string;
      password: string;
      screenName: string;
    };

    if (!username || !password || !screenName) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { screenName }] },
    });
    if (existing) return res.status(409).json({ error: 'Username or screen name taken' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { username, screenName, passwordHash },
    });

    const token = signToken(user.id);
    setAuthCookie(res, token);
    return res.status(201).json({ screenName: user.screenName });
  } catch (err) {
    console.error('signUp error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/signIn', async (req, res) => {
  try {
    const { username, password } = req.body as { username: string; password: string };

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id);
    setAuthCookie(res, token);
    return res.json({ screenName: user.screenName });
  } catch (err) {
    console.error('signIn error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.get('/usernameAvailable', async (req, res) => {
  try {
    const username = req.query['username'] as string | undefined;
    if (!username) return res.status(400).json({ error: 'username query param required' });
    const user = await prisma.user.findUnique({ where: { username } });
    return res.json({ available: !user });
  } catch (err) {
    console.error('usernameAvailable error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.get('/screenNameAvailable', async (req, res) => {
  try {
    const screenName = req.query['screenName'] as string | undefined;
    if (!screenName) return res.status(400).json({ error: 'screenName query param required' });
    const user = await prisma.user.findUnique({ where: { screenName } });
    return res.json({ available: !user });
  } catch (err) {
    console.error('screenNameAvailable error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
