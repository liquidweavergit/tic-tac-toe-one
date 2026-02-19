// packages/backend/src/__tests__/me.test.ts
import request from 'supertest';
import { app } from '../index';
import { prisma } from '../lib/prisma';

beforeEach(async () => {
  await prisma.game.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.game.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

it('GET /api/v1/me returns user when authenticated', async () => {
  const signUpRes = await request(app)
    .post('/api/v1/signUp')
    .send({ username: 'alice', password: 'pw', screenName: 'Alice' });

  const cookie = signUpRes.headers['set-cookie'];

  const meRes = await request(app)
    .get('/api/v1/me')
    .set('Cookie', cookie);

  expect(meRes.status).toBe(200);
  expect(meRes.body).toMatchObject({ screenName: 'Alice', wins: 0, losses: 0 });
});

it('GET /api/v1/me returns 401 without cookie', async () => {
  const res = await request(app).get('/api/v1/me');
  expect(res.status).toBe(401);
});
