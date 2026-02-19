// packages/backend/src/routes/user.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const userRouter = Router();

userRouter.get('/me', requireAuth, async (_req, res) => {
  try {
    const userId = res.locals.userId;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return res.json({ screenName: user.screenName, wins: user.wins, losses: user.losses });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
