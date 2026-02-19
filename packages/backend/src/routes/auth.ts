// packages/backend/src/routes/auth.ts
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
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

authRouter.post('/signUp', async (req, res) => {
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
});

authRouter.post('/signIn', async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user.id);
  setAuthCookie(res, token);
  return res.json({ screenName: user.screenName });
});

authRouter.get('/usernameAvailable', async (req, res) => {
  const username = req.query['username'] as string;
  const user = await prisma.user.findUnique({ where: { username } });
  return res.json({ available: !user });
});

authRouter.get('/screenNameAvailable', async (req, res) => {
  const screenName = req.query['screenName'] as string;
  const user = await prisma.user.findUnique({ where: { screenName } });
  return res.json({ available: !user });
});
