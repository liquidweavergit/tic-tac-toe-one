// packages/backend/src/__tests__/auth.test.ts
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

describe('POST /api/v1/signUp', () => {
  it('creates a user and returns screenName with a cookie', async () => {
    const res = await request(app)
      .post('/api/v1/signUp')
      .send({ username: 'alice', password: 'password123', screenName: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.screenName).toBe('Alice');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects duplicate username', async () => {
    await request(app)
      .post('/api/v1/signUp')
      .send({ username: 'alice', password: 'password123', screenName: 'Alice' });

    const res = await request(app)
      .post('/api/v1/signUp')
      .send({ username: 'alice', password: 'password123', screenName: 'Alice2' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/v1/signIn', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/v1/signUp')
      .send({ username: 'alice', password: 'password123', screenName: 'Alice' });
  });

  it('signs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/signIn')
      .send({ username: 'alice', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.screenName).toBe('Alice');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/signIn')
      .send({ username: 'alice', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/usernameAvailable', () => {
  it('returns true when username is free', async () => {
    const res = await request(app).get('/api/v1/usernameAvailable?username=newuser');
    expect(res.body).toEqual({ available: true });
  });

  it('returns false when username is taken', async () => {
    await request(app)
      .post('/api/v1/signUp')
      .send({ username: 'alice', password: 'pw', screenName: 'Alice' });
    const res = await request(app).get('/api/v1/usernameAvailable?username=alice');
    expect(res.body).toEqual({ available: false });
  });
});

describe('GET /api/v1/screenNameAvailable', () => {
  it('returns true when screen name is free', async () => {
    const res = await request(app).get('/api/v1/screenNameAvailable?screenName=newname');
    expect(res.body).toEqual({ available: true });
  });

  it('returns false when screen name is taken', async () => {
    await request(app)
      .post('/api/v1/signUp')
      .send({ username: 'alice', password: 'pw', screenName: 'Alice' });
    const res = await request(app).get('/api/v1/screenNameAvailable?screenName=Alice');
    expect(res.body).toEqual({ available: false });
  });
});
