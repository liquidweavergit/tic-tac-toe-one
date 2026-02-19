# Tic-Tac-Toe Multiplayer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack real-time multiplayer tic-tac-toe app with auth, matchmaking, AI opponent, and animated UI.

**Architecture:** pnpm monorepo with `packages/shared` (types), `packages/backend` (Express + socket.io + Prisma), and `packages/frontend` (Vite + React + Zustand). REST handles auth; socket.io handles all real-time game and lobby communication. Server is the single source of truth — clients rehydrate from server state on reconnect.

**Tech Stack:** Node.js 20, Express, socket.io, Prisma + PostgreSQL 15, bcrypt, jsonwebtoken; React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, socket.io-client; Docker Compose; pnpm workspaces; Jest + supertest (backend tests); Vitest + React Testing Library (frontend tests).

---

## Phase 1: Monorepo Foundation

### Task 1: pnpm Workspace Setup

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)
- Create: `.gitignore`
- Create: `.nvmrc`

**Step 1: Create root package.json**

```json
{
  "name": "tic-tac-toe-one",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter './packages/*' run dev",
    "build": "pnpm --filter './packages/*' run build",
    "test": "pnpm --filter './packages/*' run test"
  }
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
```

**Step 3: Create .nvmrc**

```
20
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
.env
*.env.local
```

**Step 5: Commit**

```bash
git add pnpm-workspace.yaml package.json .gitignore .nvmrc
git commit -m "chore: init pnpm workspace"
```

---

### Task 2: Shared Types Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/events.ts`
- Create: `packages/shared/src/index.ts`

**Step 1: Create packages/shared/package.json**

```json
{
  "name": "@ttt/shared",
  "version": "0.1.0",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

**Step 2: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**Step 3: Create packages/shared/src/types.ts**

```typescript
export type CellValue = 'x' | 'o' | null;
export type Turn = 'x' | 'o';
export type GameStatus = 'waiting' | 'countdown' | 'active' | 'finished';
export type Winner = 'x' | 'o' | 'draw' | null;

export interface PlayerInfo {
  screenName: string;
  wins: number;
  losses: number;
}

export interface GameState {
  gameId: string;
  board: CellValue[];        // length 9
  currentTurn: Turn;
  status: GameStatus;
  playerX: PlayerInfo;
  playerO: PlayerInfo | null;
  winner: Winner;
  winningCells: number[] | null;
  elapsedSeconds: number;
}

export interface ActiveGameSummary {
  id: string;
  playerX: string;
  playerO: string | null;
}

export interface LobbyUpdate {
  onlineCount: number;
  activeGames: ActiveGameSummary[];
  waitingCount: number;
}

export interface CountdownValue {
  value: 3 | 2 | 1 | 'TIC-TAC-GO!';
}

export interface MovePayload {
  cell: number; // 0-8
}

export interface PostGameAction {
  action: 'rematch' | 'new_opponent' | 'quit';
}

export interface GameOverPayload {
  winner: Winner;
  winningCells: number[] | null;
}

export interface WatchPayload {
  gameId: string;
}

export interface PlayPayload {
  vsAI?: boolean;
}

export interface JoinGamePayload {
  gameId: string;
}
```

**Step 4: Create packages/shared/src/events.ts**

```typescript
// Lobby events
export const LOBBY_EVENTS = {
  // Client → server
  JOIN_LOBBY: 'join_lobby',
  PLAY: 'play',
  WATCH: 'watch',
  // Server → client
  LOBBY_UPDATE: 'lobby_update',
} as const;

// Game events
export const GAME_EVENTS = {
  // Client → server
  JOIN_GAME: 'join_game',
  PREVIEW_MOVE: 'preview_move',
  COMMIT_MOVE: 'commit_move',
  POST_GAME_ACTION: 'post_game_action',
  // Server → client
  GAME_STATE: 'game_state',
  COUNTDOWN: 'countdown',
  GAME_OVER: 'game_over',
  OPPONENT_LEFT: 'opponent_left',
} as const;
```

**Step 5: Create packages/shared/src/index.ts**

```typescript
export * from './types';
export * from './events';
```

**Step 6: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add shared types and socket event constants"
```

---

### Task 3: Backend Package Skeleton

**Files:**
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/backend/.env.example`
- Create: `packages/backend/src/index.ts`

**Step 1: Create packages/backend/package.json**

```json
{
  "name": "@ttt/backend",
  "version": "0.1.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand",
    "migrate": "prisma migrate deploy"
  },
  "dependencies": {
    "@ttt/shared": "workspace:*",
    "@prisma/client": "^5.0.0",
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.0.0",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.0.0",
    "socket.io-client": "^4.7.4",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.4",
    "tsx": "^4.7.0",
    "typescript": "^5.4.5"
  }
}
```

**Step 2: Create packages/backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "paths": {
      "@ttt/shared": ["../shared/src/index.ts"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create packages/backend/.env.example**

```
DATABASE_URL=postgresql://ttt:ttt@localhost:5432/ttt
JWT_SECRET=changeme
PORT=4000
```

**Step 4: Create packages/backend/src/index.ts** (minimal — just starts the server)

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));

export const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:3000', credentials: true },
});

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => console.log(`Backend listening on :${PORT}`));

export { app, httpServer };
```

**Step 5: Install and verify**

```bash
cd packages/backend && pnpm install
pnpm dev
# Expected: "Backend listening on :4000"
# curl http://localhost:4000/health → {"ok":true}
```

**Step 6: Commit**

```bash
git add packages/backend/
git commit -m "feat(backend): skeleton Express + socket.io server"
```

---

### Task 4: Prisma Schema and Migration

**Files:**
- Create: `packages/backend/prisma/schema.prisma`
- Create: `packages/backend/jest.config.ts`

**Step 1: Create packages/backend/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  username     String   @unique
  screenName   String   @unique @map("screen_name")
  passwordHash String   @map("password_hash")
  wins         Int      @default(0)
  losses       Int      @default(0)
  createdAt    DateTime @default(now()) @map("created_at")
  gamesAsX     Game[]   @relation("PlayerX")
  gamesAsO     Game[]   @relation("PlayerO")

  @@map("users")
}

model Game {
  id          String    @id @default(uuid())
  playerX     User      @relation("PlayerX", fields: [playerXId], references: [id])
  playerXId   String    @map("player_x_id")
  playerO     User?     @relation("PlayerO", fields: [playerOId], references: [id])
  playerOId   String?   @map("player_o_id")
  boardState  String    @default("_________") @map("board_state")
  currentTurn String    @default("x") @map("current_turn")
  status      String    @default("waiting")
  winner      String?
  startedAt   DateTime? @map("started_at")
  finishedAt  DateTime? @map("finished_at")

  @@map("games")
}
```

**Step 2: Start postgres via Docker, run migration**

```bash
docker run -d --name ttt-postgres \
  -e POSTGRES_USER=ttt \
  -e POSTGRES_PASSWORD=ttt \
  -e POSTGRES_DB=ttt \
  -p 5432:5432 \
  postgres:15

# In packages/backend, copy .env.example to .env
cp .env.example .env

cd packages/backend
pnpm exec prisma migrate dev --name init
```

Expected: Migration created and applied, `Prisma Client generated`.

**Step 3: Create packages/backend/jest.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@ttt/shared$': '<rootDir>/../shared/src/index.ts',
  },
  testPathPattern: 'src/__tests__',
};

export default config;
```

**Step 4: Commit**

```bash
git add packages/backend/prisma/ packages/backend/jest.config.ts
git commit -m "feat(backend): add Prisma schema and initial migration"
```

---

### Task 5: Frontend Package Skeleton

**Files:**
- Create: `packages/frontend/package.json`
- Create: `packages/frontend/tsconfig.json`
- Create: `packages/frontend/vite.config.ts`
- Create: `packages/frontend/index.html`
- Create: `packages/frontend/src/main.tsx`
- Create: `packages/frontend/src/App.tsx`
- Create: `packages/frontend/src/index.css`
- Create: `packages/frontend/tailwind.config.ts`
- Create: `packages/frontend/postcss.config.js`

**Step 1: Create packages/frontend/package.json**

```json
{
  "name": "@ttt/frontend",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@ttt/shared": "workspace:*",
    "framer-motion": "^11.1.7",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "socket.io-client": "^4.7.4",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

**Step 2: Create packages/frontend/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@ttt/shared': '../shared/src/index.ts' },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
```

**Step 3: Create packages/frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": { "@ttt/shared": ["../shared/src/index.ts"] }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create packages/frontend/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

**Step 5: Create packages/frontend/postcss.config.js**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

**Step 6: Create packages/frontend/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tic-Tac-Toe</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 7: Create packages/frontend/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 8: Create packages/frontend/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 9: Create packages/frontend/src/App.tsx** (stub)

```tsx
export default function App() {
  return <div className="min-h-screen bg-gray-900 text-white">Loading...</div>;
}
```

**Step 10: Install and verify**

```bash
cd packages/frontend && pnpm install
pnpm dev
# Expected: Vite dev server at http://localhost:3000
```

**Step 11: Commit**

```bash
git add packages/frontend/
git commit -m "feat(frontend): Vite + React + Tailwind skeleton"
```

---

## Phase 2: Backend Auth

### Task 6: JWT Utility

**Files:**
- Create: `packages/backend/src/lib/jwt.ts`
- Create: `packages/backend/src/__tests__/jwt.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/backend/src/__tests__/jwt.test.ts
import { signToken, verifyToken } from '../lib/jwt';

process.env.JWT_SECRET = 'test-secret';

describe('jwt', () => {
  it('signs and verifies a token with userId', () => {
    const token = signToken('user-123');
    const payload = verifyToken(token);
    expect(payload.userId).toBe('user-123');
  });

  it('returns null for an invalid token', () => {
    expect(verifyToken('bad.token.here')).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/backend && pnpm test -- --testPathPattern=jwt
# Expected: FAIL - Cannot find module '../lib/jwt'
```

**Step 3: Create packages/backend/src/lib/jwt.ts**

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=jwt
# Expected: PASS (2 tests)
```

**Step 5: Commit**

```bash
git add packages/backend/src/lib/jwt.ts packages/backend/src/__tests__/jwt.test.ts
git commit -m "feat(backend): JWT sign/verify utility with tests"
```

---

### Task 7: Prisma Client Singleton

**Files:**
- Create: `packages/backend/src/lib/prisma.ts`

**Step 1: Create packages/backend/src/lib/prisma.ts**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['query'] : [] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Step 2: Commit**

```bash
git add packages/backend/src/lib/prisma.ts
git commit -m "feat(backend): Prisma client singleton"
```

---

### Task 8: Auth REST Endpoints

**Files:**
- Create: `packages/backend/src/routes/auth.ts`
- Create: `packages/backend/src/__tests__/auth.test.ts`
- Modify: `packages/backend/src/index.ts`

**Step 1: Write failing tests**

```typescript
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
```

**Step 2: Run tests to verify they fail**

```bash
cd packages/backend && pnpm test -- --testPathPattern=auth
# Expected: FAIL - Cannot find route handlers
```

**Step 3: Create packages/backend/src/routes/auth.ts**

```typescript
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
```

**Step 4: Mount the router in packages/backend/src/index.ts**

Add after the existing middleware:
```typescript
import { authRouter } from './routes/auth';
// ...
app.use('/api/v1', authRouter);
```

**Step 5: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=auth
# Expected: PASS (all auth tests)
```

**Step 6: Commit**

```bash
git add packages/backend/src/routes/auth.ts packages/backend/src/__tests__/auth.test.ts packages/backend/src/index.ts
git commit -m "feat(backend): signUp, signIn, availability endpoints with tests"
```

---

### Task 9: Auth Middleware + /me Endpoint

**Files:**
- Create: `packages/backend/src/middleware/auth.ts`
- Create: `packages/backend/src/routes/user.ts`
- Create: `packages/backend/src/__tests__/me.test.ts`
- Modify: `packages/backend/src/index.ts`

**Step 1: Write failing test**

```typescript
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
```

**Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=me
# Expected: FAIL
```

**Step 3: Create packages/backend/src/middleware/auth.ts**

```typescript
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
```

**Step 4: Create packages/backend/src/routes/user.ts**

```typescript
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const userRouter = Router();

userRouter.get('/me', requireAuth, async (_req, res) => {
  const userId = res.locals['userId'] as string;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return res.json({ screenName: user.screenName, wins: user.wins, losses: user.losses });
});
```

**Step 5: Mount in packages/backend/src/index.ts**

```typescript
import { userRouter } from './routes/user';
// ...
app.use('/api/v1', userRouter);
```

**Step 6: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=me
# Expected: PASS
```

**Step 7: Commit**

```bash
git add packages/backend/src/middleware/ packages/backend/src/routes/user.ts packages/backend/src/__tests__/me.test.ts packages/backend/src/index.ts
git commit -m "feat(backend): auth middleware and /me endpoint with tests"
```

---

## Phase 3: Backend Socket / Game Logic

### Task 10: Win Detection Utility

**Files:**
- Create: `packages/backend/src/lib/gameLogic.ts`
- Create: `packages/backend/src/__tests__/gameLogic.test.ts`

**Step 1: Write failing tests**

```typescript
// packages/backend/src/__tests__/gameLogic.test.ts
import { checkWinner, boardFromString, boardToString } from '../lib/gameLogic';

describe('checkWinner', () => {
  it('detects a row win for x', () => {
    const board = ['x','x','x','o','o','_','_','_','_'];
    const result = checkWinner(board);
    expect(result).toEqual({ winner: 'x', cells: [0, 1, 2] });
  });

  it('detects a column win for o', () => {
    const board = ['o','x','x','o','x','_','o','_','_'];
    const result = checkWinner(board);
    expect(result).toEqual({ winner: 'o', cells: [0, 3, 6] });
  });

  it('detects a diagonal win', () => {
    const board = ['x','o','o','o','x','o','_','_','x'];
    const result = checkWinner(board);
    expect(result).toEqual({ winner: 'x', cells: [0, 4, 8] });
  });

  it('detects a draw', () => {
    const board = ['x','o','x','x','o','x','o','x','o'];
    const result = checkWinner(board);
    expect(result).toEqual({ winner: 'draw', cells: null });
  });

  it('returns null when game is ongoing', () => {
    const board = ['x','o','_','_','_','_','_','_','_'];
    expect(checkWinner(board)).toBeNull();
  });
});

describe('boardFromString / boardToString', () => {
  it('round-trips correctly', () => {
    const original = 'xo_x__o__';
    expect(boardToString(boardFromString(original))).toBe(original);
  });
});
```

**Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=gameLogic
# Expected: FAIL
```

**Step 3: Create packages/backend/src/lib/gameLogic.ts**

```typescript
type Cell = 'x' | 'o' | '_';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

export function checkWinner(
  board: string[]
): { winner: 'x' | 'o' | 'draw'; cells: number[] | null } | null {
  for (const [a, b, c] of LINES) {
    if (board[a] !== '_' && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a] as 'x' | 'o', cells: [a, b, c] };
    }
  }
  if (board.every((c) => c !== '_')) return { winner: 'draw', cells: null };
  return null;
}

export function boardFromString(s: string): string[] {
  return s.split('');
}

export function boardToString(board: string[]): string {
  return board.join('');
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=gameLogic
# Expected: PASS (5 tests)
```

**Step 5: Commit**

```bash
git add packages/backend/src/lib/gameLogic.ts packages/backend/src/__tests__/gameLogic.test.ts
git commit -m "feat(backend): win detection and board utilities with tests"
```

---

### Task 11: Minimax AI

**Files:**
- Create: `packages/backend/src/lib/ai.ts`
- Create: `packages/backend/src/__tests__/ai.test.ts`

**Step 1: Write failing tests**

```typescript
// packages/backend/src/__tests__/ai.test.ts
import { getBestMove } from '../lib/ai';

describe('getBestMove', () => {
  it('blocks opponent win', () => {
    // x at 0,1 — o must block at 2
    const board = ['x','x','_','o','_','_','_','_','_'];
    expect(getBestMove(board, 'o')).toBe(2);
  });

  it('takes the winning move', () => {
    // o at 3,4 — o should win at 5
    const board = ['x','x','o','o','o','_','x','_','_'];
    expect(getBestMove(board, 'o')).toBe(5);
  });

  it('plays center on empty board', () => {
    const board = Array(9).fill('_');
    expect(getBestMove(board, 'x')).toBe(4);
  });
});
```

**Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=ai
# Expected: FAIL
```

**Step 3: Create packages/backend/src/lib/ai.ts**

```typescript
import { checkWinner } from './gameLogic';

type Player = 'x' | 'o';

function opponent(p: Player): Player {
  return p === 'x' ? 'o' : 'x';
}

function minimax(board: string[], player: Player, isMaximizing: boolean, aiPlayer: Player): number {
  const result = checkWinner(board);
  if (result) {
    if (result.winner === aiPlayer) return 10;
    if (result.winner === 'draw') return 0;
    return -10;
  }

  const scores: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] !== '_') continue;
    board[i] = player;
    scores.push(minimax(board, opponent(player), !isMaximizing, aiPlayer));
    board[i] = '_';
  }

  return isMaximizing ? Math.max(...scores) : Math.min(...scores);
}

export function getBestMove(board: string[], aiPlayer: Player): number {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] !== '_') continue;
    board[i] = aiPlayer;
    const score = minimax(board, opponent(aiPlayer), false, aiPlayer);
    board[i] = '_';
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=ai
# Expected: PASS (3 tests)
```

**Step 5: Commit**

```bash
git add packages/backend/src/lib/ai.ts packages/backend/src/__tests__/ai.test.ts
git commit -m "feat(backend): minimax AI with tests"
```

---

### Task 12: Matchmaking Service

**Files:**
- Create: `packages/backend/src/matchmaking.ts`
- Create: `packages/backend/src/__tests__/matchmaking.test.ts`

**Step 1: Write failing tests**

```typescript
// packages/backend/src/__tests__/matchmaking.test.ts
import { MatchmakingQueue } from '../matchmaking';

describe('MatchmakingQueue', () => {
  let queue: MatchmakingQueue;

  beforeEach(() => { queue = new MatchmakingQueue(); });

  it('adds a player when queue is empty and returns null', () => {
    expect(queue.enqueue('user1', 'socket1')).toBeNull();
    expect(queue.size()).toBe(1);
  });

  it('matches two players and clears the queue', () => {
    queue.enqueue('user1', 'socket1');
    const match = queue.enqueue('user2', 'socket2');
    expect(match).toEqual({ userId: 'user1', socketId: 'socket1' });
    expect(queue.size()).toBe(0);
  });

  it('removes a player from the queue', () => {
    queue.enqueue('user1', 'socket1');
    queue.remove('user1');
    expect(queue.size()).toBe(0);
  });
});
```

**Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=matchmaking
# Expected: FAIL
```

**Step 3: Create packages/backend/src/matchmaking.ts**

```typescript
interface QueueEntry {
  userId: string;
  socketId: string;
}

export class MatchmakingQueue {
  private queue: QueueEntry[] = [];

  enqueue(userId: string, socketId: string): QueueEntry | null {
    if (this.queue.length === 0) {
      this.queue.push({ userId, socketId });
      return null;
    }
    return this.queue.shift()!;
  }

  remove(userId: string): void {
    this.queue = this.queue.filter((e) => e.userId !== userId);
  }

  size(): number {
    return this.queue.length;
  }
}

export const matchmakingQueue = new MatchmakingQueue();
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=matchmaking
# Expected: PASS (3 tests)
```

**Step 5: Commit**

```bash
git add packages/backend/src/matchmaking.ts packages/backend/src/__tests__/matchmaking.test.ts
git commit -m "feat(backend): matchmaking queue with tests"
```

---

### Task 13: Socket.io Auth Middleware

**Files:**
- Create: `packages/backend/src/socket/authMiddleware.ts`
- Modify: `packages/backend/src/index.ts`

**Step 1: Create packages/backend/src/socket/authMiddleware.ts**

```typescript
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

  socket.data['userId'] = payload.userId;
  return next();
}
```

**Step 2: Commit**

```bash
git add packages/backend/src/socket/authMiddleware.ts
git commit -m "feat(backend): socket.io JWT auth middleware"
```

---

### Task 14: Lobby Socket Handler

**Files:**
- Create: `packages/backend/src/socket/lobbyHandler.ts`
- Modify: `packages/backend/src/index.ts`

**Step 1: Create packages/backend/src/socket/lobbyHandler.ts**

```typescript
import { Namespace, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { matchmakingQueue } from '../matchmaking';
import { LOBBY_EVENTS, LobbyUpdate, PlayPayload, WatchPayload } from '@ttt/shared';
import { socketAuthMiddleware } from './authMiddleware';

export function registerLobbyNamespace(io: import('socket.io').Server) {
  const lobby: Namespace = io.of('/lobby');
  lobby.use(socketAuthMiddleware);

  async function broadcastLobbyUpdate() {
    const [activeGames, onlineCount] = await Promise.all([
      prisma.game.findMany({
        where: { status: { in: ['waiting', 'countdown', 'active'] } },
        include: {
          playerX: { select: { screenName: true } },
          playerO: { select: { screenName: true } },
        },
      }),
      lobby.fetchSockets().then((s) => s.length),
    ]);

    const update: LobbyUpdate = {
      onlineCount,
      activeGames: activeGames.map((g) => ({
        id: g.id,
        playerX: g.playerX.screenName,
        playerO: g.playerO?.screenName ?? null,
      })),
      waitingCount: matchmakingQueue.size(),
    };

    lobby.emit(LOBBY_EVENTS.LOBBY_UPDATE, update);
  }

  lobby.on('connection', async (socket: Socket) => {
    socket.on(LOBBY_EVENTS.JOIN_LOBBY, () => broadcastLobbyUpdate());

    socket.on(LOBBY_EVENTS.WATCH, ({ gameId }: WatchPayload) => {
      // Client handles navigation; just emit current state
      socket.emit('navigate_to_game', { gameId });
    });

    socket.on('disconnect', () => broadcastLobbyUpdate());
  });

  return { broadcastLobbyUpdate };
}
```

**Step 2: Register in packages/backend/src/index.ts**

```typescript
import { registerLobbyNamespace } from './socket/lobbyHandler';
// after io is created:
registerLobbyNamespace(io);
```

**Step 3: Commit**

```bash
git add packages/backend/src/socket/lobbyHandler.ts packages/backend/src/index.ts
git commit -m "feat(backend): lobby socket namespace with live updates"
```

---

### Task 15: Game Socket Handler

**Files:**
- Create: `packages/backend/src/socket/gameHandler.ts`
- Modify: `packages/backend/src/index.ts`

**Step 1: Create packages/backend/src/socket/gameHandler.ts**

This is the core game handler. Implement it in full:

```typescript
import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { matchmakingQueue } from '../matchmaking';
import { checkWinner, boardFromString, boardToString } from '../lib/gameLogic';
import { getBestMove } from '../lib/ai';
import { socketAuthMiddleware } from './authMiddleware';
import {
  GAME_EVENTS,
  LOBBY_EVENTS,
  GameState,
  MovePayload,
  PostGameAction,
  PlayPayload,
  JoinGamePayload,
  Turn,
  GameStatus,
  Winner,
} from '@ttt/shared';

// Track game start times in memory for elapsed seconds calculation
const gameStartTimes = new Map<string, Date>();

async function buildGameState(gameId: string): Promise<GameState> {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      playerX: { select: { screenName: true, wins: true, losses: true } },
      playerO: { select: { screenName: true, wins: true, losses: true } },
    },
  });

  const startTime = gameStartTimes.get(gameId);
  const elapsedSeconds =
    game.status === 'active' && startTime
      ? Math.floor((Date.now() - startTime.getTime()) / 1000)
      : 0;

  const board = boardFromString(game.boardState);
  const winResult = checkWinner(board);

  return {
    gameId: game.id,
    board: board.map((c) => (c === '_' ? null : (c as 'x' | 'o'))),
    currentTurn: game.currentTurn as Turn,
    status: game.status as GameStatus,
    playerX: game.playerX,
    playerO: game.playerO ?? null,
    winner: (game.winner as Winner) ?? null,
    winningCells: winResult?.cells ?? null,
    elapsedSeconds,
  };
}

async function sendCountdown(io: Server, gameId: string) {
  const ticks: Array<3 | 2 | 1 | 'TIC-TAC-GO!'> = [3, 2, 1, 'TIC-TAC-GO!'];
  for (const value of ticks) {
    io.of('/game').to(gameId).emit(GAME_EVENTS.COUNTDOWN, { value });
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export function registerGameNamespace(io: Server) {
  const gameNs = io.of('/game');
  gameNs.use(socketAuthMiddleware);

  // Handle matchmaking play from lobby
  io.of('/lobby').on('connection', (socket: Socket) => {
    socket.on(LOBBY_EVENTS.PLAY, async (payload: PlayPayload = {}) => {
      const userId = socket.data['userId'] as string;

      if (payload.vsAI) {
        // Immediately create AI game
        const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const game = await prisma.game.create({
          data: {
            playerXId: userId,
            playerOId: null, // AI has no DB user
            status: 'active',
          },
        });
        gameStartTimes.set(game.id, new Date());
        socket.emit('navigate_to_game', { gameId: game.id });
        return;
      }

      const waiting = matchmakingQueue.enqueue(userId, socket.id);

      if (!waiting) {
        // This player is now waiting — create a placeholder game
        const game = await prisma.game.create({ data: { playerXId: userId } });
        socket.data['waitingGameId'] = game.id;
        socket.emit('navigate_to_game', { gameId: game.id });
        return;
      }

      // Found a match — waiting player is X, new player is O
      const waitingGameId = (await io.of('/lobby').fetchSockets())
        .find((s) => s.data['userId'] === waiting.userId)
        ?.data['waitingGameId'] as string | undefined;

      if (!waitingGameId) return; // edge case: stale

      const game = await prisma.game.update({
        where: { id: waitingGameId },
        data: { playerOId: userId, status: 'countdown' },
      });

      socket.emit('navigate_to_game', { gameId: game.id });

      // Start countdown then mark active
      await sendCountdown(io, game.id);
      await prisma.game.update({ where: { id: game.id }, data: { status: 'active', startedAt: new Date() } });
      gameStartTimes.set(game.id, new Date());
      const state = await buildGameState(game.id);
      io.of('/game').to(game.id).emit(GAME_EVENTS.GAME_STATE, state);
      io.of('/lobby').emit(LOBBY_EVENTS.LOBBY_UPDATE); // trigger refresh
    });
  });

  gameNs.on('connection', async (socket: Socket) => {
    const userId = socket.data['userId'] as string;

    socket.on(GAME_EVENTS.JOIN_GAME, async ({ gameId }: JoinGamePayload) => {
      await socket.join(gameId);
      const state = await buildGameState(gameId);
      socket.emit(GAME_EVENTS.GAME_STATE, state);
    });

    socket.on(GAME_EVENTS.PREVIEW_MOVE, ({ cell }: MovePayload) => {
      // Echo only to sender for local preview display
      socket.emit('preview_ack', { cell });
    });

    socket.on(GAME_EVENTS.COMMIT_MOVE, async ({ cell }: MovePayload) => {
      const rooms = [...socket.rooms].filter((r) => r !== socket.id);
      const gameId = rooms[0];
      if (!gameId) return;

      const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
      if (game.status !== 'active') return;

      const board = boardFromString(game.boardState);
      if (board[cell] !== '_') return;

      const turn = game.currentTurn as 'x' | 'o';

      // Verify it's this user's turn
      const isX = game.playerXId === userId;
      const isO = game.playerOId === userId;
      if ((turn === 'x' && !isX) || (turn === 'o' && !isO)) return;

      board[cell] = turn;
      const nextTurn: Turn = turn === 'x' ? 'o' : 'x';
      const winResult = checkWinner(board);

      if (winResult) {
        // Game over
        const winner = winResult.winner as Winner;
        await prisma.game.update({
          where: { id: gameId },
          data: {
            boardState: boardToString(board),
            status: 'finished',
            winner: winner ?? undefined,
            finishedAt: new Date(),
          },
        });

        // Update win/loss records
        if (winner === 'x' || winner === 'o') {
          const winnerId = winner === 'x' ? game.playerXId : game.playerOId;
          const loserId = winner === 'x' ? game.playerOId : game.playerXId;
          if (winnerId) await prisma.user.update({ where: { id: winnerId }, data: { wins: { increment: 1 } } });
          if (loserId) await prisma.user.update({ where: { id: loserId }, data: { losses: { increment: 1 } } });
        }

        const state = await buildGameState(gameId);
        gameNs.to(gameId).emit(GAME_EVENTS.GAME_STATE, state);
        gameNs.to(gameId).emit(GAME_EVENTS.GAME_OVER, {
          winner: winResult.winner,
          winningCells: winResult.cells,
        });
      } else {
        await prisma.game.update({
          where: { id: gameId },
          data: { boardState: boardToString(board), currentTurn: nextTurn },
        });

        const state = await buildGameState(gameId);
        gameNs.to(gameId).emit(GAME_EVENTS.GAME_STATE, state);

        // If next turn is AI (playerOId is null)
        if (nextTurn === 'o' && !game.playerOId) {
          setTimeout(async () => {
            const freshGame = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
            const freshBoard = boardFromString(freshGame.boardState);
            const aiMove = getBestMove(freshBoard, 'o');
            freshBoard[aiMove] = 'o';
            const aiWin = checkWinner(freshBoard);

            if (aiWin) {
              await prisma.game.update({
                where: { id: gameId },
                data: { boardState: boardToString(freshBoard), status: 'finished', winner: aiWin.winner ?? undefined, finishedAt: new Date() },
              });
              if (aiWin.winner === 'o') {
                await prisma.user.update({ where: { id: game.playerXId }, data: { losses: { increment: 1 } } });
              }
              const s = await buildGameState(gameId);
              gameNs.to(gameId).emit(GAME_EVENTS.GAME_STATE, s);
              gameNs.to(gameId).emit(GAME_EVENTS.GAME_OVER, { winner: aiWin.winner, winningCells: aiWin.cells });
            } else {
              await prisma.game.update({ where: { id: gameId }, data: { boardState: boardToString(freshBoard), currentTurn: 'x' } });
              const s = await buildGameState(gameId);
              gameNs.to(gameId).emit(GAME_EVENTS.GAME_STATE, s);
            }
          }, 500); // Small delay so AI "thinks"
        }
      }
    });

    socket.on(GAME_EVENTS.POST_GAME_ACTION, async ({ action }: PostGameAction) => {
      const rooms = [...socket.rooms].filter((r) => r !== socket.id);
      const gameId = rooms[0];
      if (!gameId) return;

      const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
      if (game.status !== 'finished') return;

      if (action === 'quit') {
        socket.leave(gameId);
        gameNs.to(gameId).emit(GAME_EVENTS.OPPONENT_LEFT);
        return;
      }

      if (action === 'new_opponent') {
        socket.leave(gameId);
        gameNs.to(gameId).emit(GAME_EVENTS.OPPONENT_LEFT);
        // Re-enqueue this player via lobby
        return;
      }

      if (action === 'rematch') {
        // Store intent; wait for both players
        const key = `rematch:${gameId}`;
        if (!socket.data[key]) {
          socket.data[key] = true;
          // Check if the other player already accepted
          const sockets = await gameNs.in(gameId).fetchSockets();
          const bothReady = sockets.every((s) => s.data[key]);
          if (bothReady) {
            // Determine new X: previous winner plays X
            const prevWinner = game.winner; // 'x' | 'o' | 'draw' | null
            const newXId = prevWinner === 'x' ? game.playerXId : (prevWinner === 'o' ? game.playerOId! : game.playerXId);
            const newOId = newXId === game.playerXId ? game.playerOId : game.playerXId;

            const newGame = await prisma.game.create({
              data: { playerXId: newXId, playerOId: newOId, status: 'countdown' },
            });

            for (const s of sockets) {
              s.emit('navigate_to_game', { gameId: newGame.id });
            }

            await sendCountdown(io, newGame.id);
            await prisma.game.update({ where: { id: newGame.id }, data: { status: 'active', startedAt: new Date() } });
            gameStartTimes.set(newGame.id, new Date());
            const state = await buildGameState(newGame.id);
            gameNs.to(newGame.id).emit(GAME_EVENTS.GAME_STATE, state);
          }
        }
      }
    });

    socket.on('disconnect', async () => {
      const rooms = [...socket.rooms].filter((r) => r !== socket.id);
      for (const gameId of rooms) {
        gameNs.to(gameId).emit(GAME_EVENTS.OPPONENT_LEFT);
      }
      matchmakingQueue.remove(userId);
    });
  });
}
```

**Step 2: Register in packages/backend/src/index.ts**

```typescript
import { registerGameNamespace } from './socket/gameHandler';
// after io and lobby are set up:
registerGameNamespace(io);
```

**Step 3: Commit**

```bash
git add packages/backend/src/socket/gameHandler.ts packages/backend/src/index.ts
git commit -m "feat(backend): game socket handler with matchmaking, moves, AI, post-game"
```

---

## Phase 4: Frontend

### Task 16: Zustand Stores

**Files:**
- Create: `packages/frontend/src/store/authStore.ts`
- Create: `packages/frontend/src/store/lobbyStore.ts`
- Create: `packages/frontend/src/store/gameStore.ts`

**Step 1: Create packages/frontend/src/store/authStore.ts**

```typescript
import { create } from 'zustand';

interface AuthState {
  screenName: string | null;
  wins: number;
  losses: number;
  setUser: (screenName: string, wins: number, losses: number) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  screenName: null,
  wins: 0,
  losses: 0,
  setUser: (screenName, wins, losses) => set({ screenName, wins, losses }),
  clearUser: () => set({ screenName: null, wins: 0, losses: 0 }),
}));
```

**Step 2: Create packages/frontend/src/store/lobbyStore.ts**

```typescript
import { create } from 'zustand';
import { ActiveGameSummary } from '@ttt/shared';

interface LobbyState {
  onlineCount: number;
  activeGames: ActiveGameSummary[];
  waitingCount: number;
  setLobby: (data: { onlineCount: number; activeGames: ActiveGameSummary[]; waitingCount: number }) => void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  onlineCount: 0,
  activeGames: [],
  waitingCount: 0,
  setLobby: (data) => set(data),
}));
```

**Step 3: Create packages/frontend/src/store/gameStore.ts**

```typescript
import { create } from 'zustand';
import { GameState } from '@ttt/shared';

interface GameStoreState {
  gameState: GameState | null;
  previewCell: number | null;
  setGameState: (state: GameState) => void;
  setPreviewCell: (cell: number | null) => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  gameState: null,
  previewCell: null,
  setGameState: (gameState) => set({ gameState }),
  setPreviewCell: (previewCell) => set({ previewCell }),
}));
```

**Step 4: Commit**

```bash
git add packages/frontend/src/store/
git commit -m "feat(frontend): Zustand stores for auth, lobby, game"
```

---

### Task 17: API Client and Socket Hooks

**Files:**
- Create: `packages/frontend/src/lib/api.ts`
- Create: `packages/frontend/src/hooks/useLobbySocket.ts`
- Create: `packages/frontend/src/hooks/useGameSocket.ts`

**Step 1: Create packages/frontend/src/lib/api.ts**

```typescript
const BASE = '/api/v1';

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  signUp: (data: { username: string; password: string; screenName: string }) =>
    request<{ screenName: string }>('POST', '/signUp', data),
  signIn: (data: { username: string; password: string }) =>
    request<{ screenName: string }>('POST', '/signIn', data),
  me: () => request<{ screenName: string; wins: number; losses: number }>('GET', '/me'),
  usernameAvailable: (username: string) =>
    request<{ available: boolean }>('GET', `/usernameAvailable?username=${encodeURIComponent(username)}`),
  screenNameAvailable: (screenName: string) =>
    request<{ available: boolean }>('GET', `/screenNameAvailable?screenName=${encodeURIComponent(screenName)}`),
};
```

**Step 2: Create packages/frontend/src/hooks/useLobbySocket.ts**

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { LOBBY_EVENTS, LobbyUpdate } from '@ttt/shared';
import { useLobbyStore } from '../store/lobbyStore';

export function useLobbySocket(onNavigateToGame: (gameId: string) => void) {
  const setLobby = useLobbyStore((s) => s.setLobby);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('/lobby', { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit(LOBBY_EVENTS.JOIN_LOBBY));
    socket.on(LOBBY_EVENTS.LOBBY_UPDATE, (data: LobbyUpdate) => setLobby(data));
    socket.on('navigate_to_game', ({ gameId }: { gameId: string }) => onNavigateToGame(gameId));

    return () => { socket.disconnect(); };
  }, []);

  return socketRef;
}
```

**Step 3: Create packages/frontend/src/hooks/useGameSocket.ts**

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GAME_EVENTS, GameState, GameOverPayload } from '@ttt/shared';
import { useGameStore } from '../store/gameStore';

export function useGameSocket(
  gameId: string,
  onGameOver: (payload: GameOverPayload) => void,
  onOpponentLeft: () => void,
  onNavigateToGame: (gameId: string) => void,
) {
  const setGameState = useGameStore((s) => s.setGameState);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('/game', { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit(GAME_EVENTS.JOIN_GAME, { gameId }));
    socket.on(GAME_EVENTS.GAME_STATE, (state: GameState) => setGameState(state));
    socket.on(GAME_EVENTS.GAME_OVER, (payload: GameOverPayload) => onGameOver(payload));
    socket.on(GAME_EVENTS.OPPONENT_LEFT, () => onOpponentLeft());
    socket.on('navigate_to_game', ({ gameId: newId }: { gameId: string }) => onNavigateToGame(newId));

    return () => { socket.disconnect(); };
  }, [gameId]);

  return socketRef;
}
```

**Step 4: Commit**

```bash
git add packages/frontend/src/lib/ packages/frontend/src/hooks/
git commit -m "feat(frontend): API client and socket hooks"
```

---

### Task 18: Router and Auth Guard

**Files:**
- Create: `packages/frontend/src/components/AuthGuard.tsx`
- Modify: `packages/frontend/src/App.tsx`

**Step 1: Create packages/frontend/src/components/AuthGuard.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { screenName, setUser } = useAuthStore();
  const [checking, setChecking] = useState(!screenName);

  useEffect(() => {
    if (screenName) return;
    api.me()
      .then((u) => setUser(u.screenName, u.wins, u.losses))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="min-h-screen bg-gray-900" />;
  if (!screenName) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

**Step 2: Rewrite packages/frontend/src/App.tsx**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <HomePage />
            </AuthGuard>
          }
        />
        <Route
          path="/game/:id"
          element={
            <AuthGuard>
              <GamePage />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Step 3: Commit**

```bash
git add packages/frontend/src/components/AuthGuard.tsx packages/frontend/src/App.tsx
git commit -m "feat(frontend): router setup with auth guard"
```

---

### Task 19: Login and Signup Pages

**Files:**
- Create: `packages/frontend/src/pages/LoginPage.tsx`
- Create: `packages/frontend/src/pages/SignupPage.tsx`

**Step 1: Create packages/frontend/src/pages/LoginPage.tsx**

```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { screenName } = await api.signIn(form);
      const me = await api.me();
      setUser(me.screenName, me.wins, me.losses);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
        <h1 className="text-2xl font-bold text-white text-center">Sign In</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          className="w-full p-2 rounded bg-gray-700 text-white"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          required
        />
        <input
          type="password"
          className="w-full p-2 rounded bg-gray-700 text-white"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        <p className="text-gray-400 text-sm text-center">
          No account? <Link to="/signup" className="text-blue-400 hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
```

**Step 2: Create packages/frontend/src/pages/SignupPage.tsx**

```tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

type AvailStatus = 'idle' | 'checking' | 'available' | 'taken';

function useAvailability(
  value: string,
  checker: (v: string) => Promise<{ available: boolean }>
): AvailStatus {
  const [status, setStatus] = useState<AvailStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value) { setStatus('idle'); return; }
    setStatus('checking');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const { available } = await checker(value);
        setStatus(available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value]);

  return status;
}

function FieldFeedback({ status }: { status: AvailStatus }) {
  if (status === 'available') return <p className="text-green-400 text-xs">Available</p>;
  if (status === 'taken') return <p className="text-red-400 text-xs">Already taken</p>;
  if (status === 'checking') return <p className="text-gray-400 text-xs">Checking…</p>;
  return null;
}

export function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ username: '', screenName: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const usernameStatus = useAvailability(form.username, (v) => api.usernameAvailable(v));
  const screenNameStatus = useAvailability(form.screenName, (v) => api.screenNameAvailable(v));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (usernameStatus !== 'available' || screenNameStatus !== 'available') return;
    setError('');
    setLoading(true);
    try {
      await api.signUp(form);
      const me = await api.me();
      setUser(me.screenName, me.wins, me.losses);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl w-80 space-y-3">
        <h1 className="text-2xl font-bold text-white text-center">Create Account</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div>
          <input
            className="w-full p-2 rounded bg-gray-700 text-white"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
          />
          <FieldFeedback status={usernameStatus} />
        </div>
        <div>
          <input
            className="w-full p-2 rounded bg-gray-700 text-white"
            placeholder="Screen name"
            value={form.screenName}
            onChange={(e) => setForm((f) => ({ ...f, screenName: e.target.value }))}
            required
          />
          <FieldFeedback status={screenNameStatus} />
        </div>
        <input
          type="password"
          className="w-full p-2 rounded bg-gray-700 text-white"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
        />
        <button
          type="submit"
          disabled={loading || usernameStatus !== 'available' || screenNameStatus !== 'available'}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create User'}
        </button>
        <p className="text-gray-400 text-sm text-center">
          Have an account? <Link to="/login" className="text-blue-400 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add packages/frontend/src/pages/LoginPage.tsx packages/frontend/src/pages/SignupPage.tsx
git commit -m "feat(frontend): Login and Signup pages with availability checks"
```

---

### Task 20: Home Page

**Files:**
- Create: `packages/frontend/src/pages/HomePage.tsx`

**Step 1: Create packages/frontend/src/pages/HomePage.tsx**

```tsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOBBY_EVENTS } from '@ttt/shared';
import { useAuthStore } from '../store/authStore';
import { useLobbyStore } from '../store/lobbyStore';
import { useLobbySocket } from '../hooks/useLobbySocket';
import { api } from '../lib/api';

export function HomePage() {
  const navigate = useNavigate();
  const { screenName, wins, losses, clearUser } = useAuthStore();
  const { onlineCount, activeGames, waitingCount } = useLobbyStore();
  const [vsAI, setVsAI] = useState(false);

  const socketRef = useLobbySocket((gameId) => navigate(`/game/${gameId}`));

  async function handleLogout() {
    // Clear cookie by navigating to a logout endpoint or just clear store
    clearUser();
    navigate('/login');
  }

  function handlePlay() {
    socketRef.current?.emit(LOBBY_EVENTS.PLAY, vsAI ? { vsAI: true } : {});
  }

  function handleWatch(gameId: string) {
    socketRef.current?.emit(LOBBY_EVENTS.WATCH, { gameId });
    navigate(`/game/${gameId}`);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700">
        <span className="font-bold text-lg">{screenName}</span>
        <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm">
          Logout
        </button>
      </div>

      {/* Center card */}
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-6">
          <h1 className="text-3xl font-bold text-center">Play Tic-Tac-Toe</h1>

          {/* Win/loss */}
          <p className="text-center text-gray-400">
            {wins}W – {losses}L
          </p>

          {/* Live stats */}
          <div className="text-sm text-gray-400 space-y-1">
            <p>Players online: <span className="text-white">{onlineCount}</span></p>
            <p>Active games: <span className="text-white">{activeGames.length}</span></p>
            <p>Waiting for opponent: <span className="text-white">{waitingCount}</span></p>
          </div>

          {/* Active games */}
          {activeGames.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-2">
              {activeGames.map((g) => (
                <div key={g.id} className="flex justify-between items-center bg-gray-700 rounded px-3 py-2 text-sm">
                  <span>{g.playerX} vs {g.playerO ?? '…'}</span>
                  <button
                    onClick={() => handleWatch(g.id)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Watch
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Play AI toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={vsAI}
              onChange={(e) => setVsAI(e.target.checked)}
              className="accent-blue-500"
            />
            Play AI
          </label>

          <button
            onClick={handlePlay}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg"
          >
            Play Tic-Tac-Toe
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/pages/HomePage.tsx
git commit -m "feat(frontend): Home page with live lobby stats"
```

---

### Task 21: Board Component

**Files:**
- Create: `packages/frontend/src/components/Board.tsx`
- Create: `packages/frontend/src/__tests__/Board.test.tsx`
- Create: `packages/frontend/vitest.config.ts`

**Step 1: Create packages/frontend/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@ttt/shared': '../shared/src/index.ts' },
  },
});
```

**Step 2: Create packages/frontend/src/__tests__/setup.ts**

```typescript
import '@testing-library/jest-dom';
```

**Step 3: Write failing test**

```tsx
// packages/frontend/src/__tests__/Board.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Board } from '../components/Board';

const emptyBoard = Array(9).fill(null) as (null | 'x' | 'o')[];

it('renders 9 cells', () => {
  render(<Board board={emptyBoard} activePlayer="x" myTurn={true} previewCell={null} onCellClick={() => {}} winningCells={null} />);
  expect(screen.getAllByRole('button')).toHaveLength(9);
});

it('calls onCellClick with the cell index', () => {
  const onClick = vi.fn();
  render(<Board board={emptyBoard} activePlayer="x" myTurn={true} previewCell={null} onCellClick={onClick} winningCells={null} />);
  fireEvent.click(screen.getAllByRole('button')[4]);
  expect(onClick).toHaveBeenCalledWith(4);
});

it('does not call onCellClick when not my turn', () => {
  const onClick = vi.fn();
  render(<Board board={emptyBoard} activePlayer="x" myTurn={false} previewCell={null} onCellClick={onClick} winningCells={null} />);
  fireEvent.click(screen.getAllByRole('button')[0]);
  expect(onClick).not.toHaveBeenCalled();
});
```

**Step 4: Run to confirm failure**

```bash
cd packages/frontend && pnpm test
# Expected: FAIL - Board component not found
```

**Step 5: Create packages/frontend/src/components/Board.tsx**

```tsx
import { motion } from 'framer-motion';
import { CellValue, Turn } from '@ttt/shared';

interface BoardProps {
  board: CellValue[];
  activePlayer: Turn;
  myTurn: boolean;
  previewCell: number | null;
  onCellClick: (cell: number) => void;
  winningCells: number[] | null;
}

export function Board({ board, activePlayer, myTurn, previewCell, onCellClick, winningCells }: BoardProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-72 h-72">
      {board.map((cell, i) => {
        const isWinning = winningCells?.includes(i) ?? false;
        const isPreview = previewCell === i && !cell;
        const displayValue = cell ?? (isPreview ? activePlayer : null);

        return (
          <button
            key={i}
            role="button"
            onClick={() => myTurn && !cell && onCellClick(i)}
            className={[
              'flex items-center justify-center text-4xl font-bold rounded-lg transition-all',
              'bg-gray-700 hover:bg-gray-600',
              isWinning ? 'bg-yellow-600' : '',
              !myTurn || cell ? 'cursor-default' : 'cursor-pointer',
            ].join(' ')}
          >
            {displayValue && (
              <motion.span
                initial={isPreview ? { opacity: 0.5 } : { scale: 0.5, opacity: 0 }}
                animate={isPreview ? { opacity: [0.5, 1, 0.5] } : { scale: 1, opacity: 1 }}
                transition={isPreview ? { repeat: Infinity, duration: 1 } : { type: 'spring', stiffness: 300 }}
                className={displayValue === 'x' ? 'text-blue-400' : 'text-red-400'}
              >
                {displayValue.toUpperCase()}
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 6: Run tests to verify they pass**

```bash
pnpm test
# Expected: PASS (3 Board tests)
```

**Step 7: Commit**

```bash
git add packages/frontend/src/components/Board.tsx packages/frontend/src/__tests__/ packages/frontend/vitest.config.ts
git commit -m "feat(frontend): Board component with preview animation and tests"
```

---

### Task 22: Player Panel Component

**Files:**
- Create: `packages/frontend/src/components/PlayerPanel.tsx`

**Step 1: Create packages/frontend/src/components/PlayerPanel.tsx**

```tsx
import { PlayerInfo, GameStatus, Winner } from '@ttt/shared';

interface PlayerPanelProps {
  player: PlayerInfo | null;
  side: 'x' | 'o';
  isActive: boolean;
  status: GameStatus;
  winner: Winner;
}

export function PlayerPanel({ player, side, isActive, status, winner }: PlayerPanelProps) {
  const isWinner = winner === side;
  const isLoser = winner !== null && winner !== 'draw' && winner !== side;

  const borderClass = isWinner
    ? 'border-green-500'
    : isLoser
    ? 'border-red-500'
    : isActive && status === 'active'
    ? 'border-blue-400'
    : 'border-transparent';

  const opacityClass = !isActive && status === 'active' ? 'opacity-40' : 'opacity-100';

  return (
    <div className={`border-2 rounded-xl p-4 w-36 transition-all ${borderClass} ${opacityClass}`}>
      {player ? (
        <>
          <p className="font-bold text-white truncate">{player.screenName}</p>
          <p className="text-gray-400 text-xs mt-1">{player.wins}W – {player.losses}L</p>
          {isActive && status === 'active' && (
            <p className="text-blue-300 text-xs mt-2">Your move</p>
          )}
          {isWinner && <p className="text-green-400 text-xs mt-2 font-bold">Winner!</p>}
          {isLoser && <p className="text-red-400 text-xs mt-2">Lost</p>}
        </>
      ) : (
        <p className="text-gray-500 text-sm">Waiting for opponent…</p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/components/PlayerPanel.tsx
git commit -m "feat(frontend): PlayerPanel component with active/win/lose states"
```

---

### Task 23: Countdown Overlay

**Files:**
- Create: `packages/frontend/src/components/CountdownOverlay.tsx`

**Step 1: Create packages/frontend/src/components/CountdownOverlay.tsx**

```tsx
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  value: 3 | 2 | 1 | 'TIC-TAC-GO!' | null;
}

export function CountdownOverlay({ value }: Props) {
  return (
    <AnimatePresence>
      {value !== null && (
        <motion.div
          key={String(value)}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
        >
          <span className="text-white text-8xl font-black">{value}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/components/CountdownOverlay.tsx
git commit -m "feat(frontend): CountdownOverlay component"
```

---

### Task 24: Post-Game Overlay

**Files:**
- Create: `packages/frontend/src/components/PostGameOverlay.tsx`

**Step 1: Create packages/frontend/src/components/PostGameOverlay.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Winner } from '@ttt/shared';

interface Props {
  winner: Winner;
  mySymbol: 'x' | 'o' | null;
  onRematch: () => void;
  onNewOpponent: () => void;
  onQuit: () => void;
}

function SnowParticle({ symbol, delay }: { symbol: string; delay: number }) {
  const x = Math.random() * 100;
  return (
    <motion.span
      className="fixed text-2xl font-bold pointer-events-none select-none"
      style={{ left: `${x}vw`, top: -40, color: symbol === 'X' ? '#60a5fa' : '#f87171' }}
      animate={{ top: '100vh' }}
      transition={{ duration: 3 + Math.random() * 2, delay, ease: 'linear' }}
    >
      {symbol}
    </motion.span>
  );
}

export function PostGameOverlay({ winner, mySymbol, onRematch, onNewOpponent, onQuit }: Props) {
  const particles = Array.from({ length: 30 }, (_, i) => i);
  const winSymbol = winner === 'x' ? 'X' : winner === 'o' ? 'O' : null;

  const resultText =
    winner === 'draw'
      ? "It's a Draw!"
      : mySymbol && winner === mySymbol
      ? 'You Win!'
      : 'You Lose!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Snow particles */}
      {winSymbol && particles.map((i) => (
        <SnowParticle key={i} symbol={winSymbol} delay={i * 0.15} />
      ))}

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-gray-800 border border-gray-600 rounded-2xl p-8 text-center space-y-6 shadow-2xl"
      >
        <h2 className="text-3xl font-black text-white">{resultText}</h2>
        <div className="flex flex-col gap-3">
          <button onClick={onRematch} className="py-2 px-6 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold">
            Rematch
          </button>
          <button onClick={onNewOpponent} className="py-2 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold">
            New Opponent
          </button>
          <button onClick={onQuit} className="py-2 px-6 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-semibold">
            Quit
          </button>
        </div>
      </motion.div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/components/PostGameOverlay.tsx
git commit -m "feat(frontend): PostGameOverlay with snow animation and action buttons"
```

---

### Task 25: Game Page

**Files:**
- Create: `packages/frontend/src/pages/GamePage.tsx`

**Step 1: Create packages/frontend/src/pages/GamePage.tsx**

```tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GAME_EVENTS, GameOverPayload, CountdownValue } from '@ttt/shared';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useGameSocket } from '../hooks/useGameSocket';
import { Board } from '../components/Board';
import { PlayerPanel } from '../components/PlayerPanel';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { PostGameOverlay } from '../components/PostGameOverlay';

export function GamePage() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { screenName } = useAuthStore();
  const { gameState, previewCell, setPreviewCell } = useGameStore();
  const [countdownValue, setCountdownValue] = useState<CountdownValue['value'] | null>(null);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);

  const socketRef = useGameSocket(
    gameId!,
    (payload) => setGameOver(payload),
    () => navigate('/'),
    (newGameId) => navigate(`/game/${newGameId}`)
  );

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on(GAME_EVENTS.COUNTDOWN, ({ value }: CountdownValue) => {
      setCountdownValue(value);
      if (value === 'TIC-TAC-GO!') {
        setTimeout(() => setCountdownValue(null), 1000);
      }
    });
  }, [socketRef.current]);

  if (!gameState) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading…</div>;
  }

  const mySymbol = gameState.playerX.screenName === screenName ? 'x' : gameState.playerO?.screenName === screenName ? 'o' : null;
  const myTurn = gameState.currentTurn === mySymbol && gameState.status === 'active';

  function handleCellClick(cell: number) {
    setPreviewCell(cell);
  }

  function handleCommit() {
    if (previewCell === null) return;
    socketRef.current?.emit(GAME_EVENTS.COMMIT_MOVE, { cell: previewCell });
    setPreviewCell(null);
  }

  function handlePostGame(action: 'rematch' | 'new_opponent' | 'quit') {
    socketRef.current?.emit(GAME_EVENTS.POST_GAME_ACTION, { action });
    if (action === 'quit' || action === 'new_opponent') navigate('/');
  }

  const elapsed = gameState.elapsedSeconds;
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6">
      {/* Countdown */}
      {gameState.status === 'countdown' && <CountdownOverlay value={countdownValue} />}

      {/* Post-game */}
      {gameState.status === 'finished' && gameOver && (
        <PostGameOverlay
          winner={gameOver.winner}
          mySymbol={mySymbol}
          onRematch={() => handlePostGame('rematch')}
          onNewOpponent={() => handlePostGame('new_opponent')}
          onQuit={() => handlePostGame('quit')}
        />
      )}

      {/* Game layout */}
      <div className="flex items-center gap-8">
        <PlayerPanel
          player={gameState.playerX}
          side="x"
          isActive={gameState.currentTurn === 'x'}
          status={gameState.status}
          winner={gameState.winner}
        />

        <div className="flex flex-col items-center gap-4">
          {/* Timer */}
          <p className="text-2xl font-mono text-gray-300">{minutes}:{seconds}</p>

          <Board
            board={gameState.board}
            activePlayer={gameState.currentTurn}
            myTurn={myTurn}
            previewCell={previewCell}
            onCellClick={handleCellClick}
            winningCells={gameState.winningCells}
          />

          {myTurn && previewCell !== null && (
            <button
              onClick={handleCommit}
              className="mt-2 px-8 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
            >
              Done
            </button>
          )}
        </div>

        <PlayerPanel
          player={gameState.playerO}
          side="o"
          isActive={gameState.currentTurn === 'o'}
          status={gameState.status}
          winner={gameState.winner}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/pages/GamePage.tsx
git commit -m "feat(frontend): Game page with board, panels, countdown, post-game"
```

---

## Phase 5: Docker Compose

### Task 26: Docker Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `packages/backend/Dockerfile`
- Create: `packages/frontend/Dockerfile`
- Create: `packages/frontend/nginx.conf`

**Step 1: Create packages/backend/Dockerfile**

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

WORKDIR /app/packages/backend
RUN pnpm exec prisma generate
RUN pnpm build

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

**Step 2: Create packages/frontend/Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
RUN npm install -g pnpm

WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend

WORKDIR /app/packages/frontend
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

**Step 3: Create packages/frontend/nginx.conf**

```nginx
server {
    listen 3000;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy API to backend
    location /api/ {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
    }

    # Proxy socket.io to backend
    location /socket.io/ {
        proxy_pass http://backend:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Step 4: Create docker-compose.yml**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: ttt
      POSTGRES_PASSWORD: ttt
      POSTGRES_DB: ttt
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ttt"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: packages/backend/Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://ttt:ttt@postgres:5432/ttt
      JWT_SECRET: ${JWT_SECRET:-change-me-in-production}
      PORT: 4000
      NODE_ENV: production

  frontend:
    build:
      context: .
      dockerfile: packages/frontend/Dockerfile
    depends_on:
      - backend
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

**Step 5: Verify Docker build**

```bash
docker compose build
# Expected: All three images build successfully

docker compose up -d
# Expected: All three services start

curl http://localhost:4000/health
# Expected: {"ok":true}

open http://localhost:3000
# Expected: Login page loads
```

**Step 6: Commit**

```bash
git add docker-compose.yml packages/backend/Dockerfile packages/frontend/Dockerfile packages/frontend/nginx.conf
git commit -m "feat: Docker Compose with frontend, backend, postgres services"
```

---

### Task 27: End-to-End Smoke Test

**Goal:** Manually verify the full happy path works before calling the feature done.

**Step 1: Start in dev mode**

```bash
# Terminal 1 (postgres already running from earlier, or via Docker)
cd packages/backend && pnpm dev

# Terminal 2
cd packages/frontend && pnpm dev
```

**Step 2: Sign up two users in two browser windows**

Open `http://localhost:3000` in two separate browser windows (or one incognito).

- Window 1: Sign up as `alice` / screen name `Alice`
- Window 2: Sign up as `bob` / screen name `Bob`

**Step 3: Matchmaking**

- Both windows click "Play Tic-Tac-Toe"
- Expected: Both navigate to `/game/:id`; countdown "3 2 1 TIC-TAC-GO!" plays; game becomes active

**Step 4: Play a game to completion**

- Alice clicks a cell → pulsating X appears → clicks "Done" → move commits
- Bob clicks a cell → commits
- Continue until win or draw
- Expected: post-game overlay appears; snow animation plays; result shown

**Step 5: Rematch**

- Both click "Rematch"
- Expected: New game starts immediately with countdown; winner from previous game plays X

**Step 6: AI game**

- Window 1: Check "Play AI" and click Play
- Expected: Game starts immediately (no countdown wait); AI responds after each move

**Step 7: Commit and tag**

```bash
git add .
git commit -m "chore: smoke test verified, feature complete"
```

---

## Summary

| Phase | Tasks | Key Deliverable |
|---|---|---|
| 1 — Foundation | 1–5 | Monorepo, shared types, skeleton apps |
| 2 — Auth | 6–9 | JWT auth, REST endpoints, middleware |
| 3 — Game Logic | 10–15 | Win detection, AI, matchmaking, sockets |
| 4 — Frontend | 16–25 | All pages and components wired up |
| 5 — Docker | 26–27 | Containerized, smoke tested |
